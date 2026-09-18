import "server-only";
import { db } from "@/lib/db";
import { checkTransferLimit } from "./walletTransferLimitService";
import { debitWithinTx, creditWithinTx } from "./walletService";
import { walletTransferSchema, type WalletTransferInput } from "@/lib/validation/schemas";
import type { Prisma } from "@prisma/client";

export interface RecipientLookupResult {
  ok: boolean;
  recipientName?: string;
  error?: string;
}

/** Read-only — used by the Send flow to show "Sending to: [Name]" before anything is committed. */
export async function lookupRecipientByAccountNumber(
  accountNumber: string,
  senderUserId: string,
): Promise<RecipientLookupResult> {
  const wallet = await db.wallet.findUnique({ where: { accountNumber }, include: { user: true } });
  if (!wallet) return { ok: false, error: "No ATG account found with that account number." };
  if (wallet.userId === senderUserId) return { ok: false, error: "You can't send money to yourself." };
  return { ok: true, recipientName: wallet.user.fullName };
}

type ResolvedTransfer =
  | { ok: true; recipientUserId: string; recipientName: string; amountMinor: number; note?: string }
  | { ok: false; error: string };

/**
 * Re-validates everything from the raw payload — recipient still exists,
 * limit still allows it — rather than trusting whatever was true when the
 * OTP was issued. Mirrors resolveCheckoutOrder()/resolveQuotationAcceptance()
 * in the checkout OTP work: inputs are stored on the OTP record, not
 * derived results, so this always re-runs against current state.
 */
export async function resolveWalletTransfer(senderId: string, payload: unknown): Promise<ResolvedTransfer> {
  const parsed = walletTransferSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid transfer details" };
  }
  const input: WalletTransferInput = parsed.data;

  const lookup = await lookupRecipientByAccountNumber(input.recipientAccountNumber, senderId);
  if (!lookup.ok || !lookup.recipientName) {
    return { ok: false, error: lookup.error ?? "Recipient not found." };
  }

  const senderWallet = await db.wallet.findUnique({ where: { userId: senderId } });
  if (!senderWallet) return { ok: false, error: "Wallet not found." };

  const amountMinor = Math.round(input.amount * 100);

  const limit = await checkTransferLimit({ userId: senderId, amountMinor, currency: senderWallet.currency });
  if (!limit.allowed) {
    return { ok: false, error: limit.reason ?? "This transfer exceeds your monthly sending limit." };
  }

  if (senderWallet.balanceMinor < amountMinor) {
    return { ok: false, error: "Insufficient wallet balance." };
  }

  const recipientWallet = await db.wallet.findUnique({ where: { accountNumber: input.recipientAccountNumber } });
  if (!recipientWallet) return { ok: false, error: "Recipient not found." };

  return {
    ok: true,
    recipientUserId: recipientWallet.userId,
    recipientName: lookup.recipientName,
    amountMinor,
    note: input.note,
  };
}

export interface ExecuteTransferResult {
  ok: boolean;
  transferId?: string;
  error?: string;
}

/**
 * The only place a transfer actually moves money — both legs (sender debit,
 * recipient credit) plus the WalletTransfer record happen inside ONE DB
 * transaction, unlike walletService.credit()/debit() which each open their
 * own. A transfer needs both sides to succeed or fail together; calling
 * debit() then credit() back to back would leave a real gap where a crash
 * between the two could debit the sender with no matching credit.
 */
export async function executeWalletTransfer(senderId: string, payload: unknown): Promise<ExecuteTransferResult> {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const parsed = walletTransferSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid transfer details" };
    }
    const input: WalletTransferInput = parsed.data;
    const amountMinor = Math.round(input.amount * 100);

    const senderWallet = await tx.wallet.findUniqueOrThrow({ where: { userId: senderId } });
    const recipientWallet = await tx.wallet.findUnique({ where: { accountNumber: input.recipientAccountNumber } });
    if (!recipientWallet) return { ok: false, error: "Recipient not found." };
    if (recipientWallet.userId === senderId) return { ok: false, error: "You can't send money to yourself." };

    const limit = await checkTransferLimit({ userId: senderId, amountMinor, currency: senderWallet.currency });
    if (!limit.allowed) return { ok: false, error: limit.reason ?? "This transfer exceeds your monthly sending limit." };

    const [sender, recipient] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: senderId }, select: { fullName: true } }),
      tx.user.findUniqueOrThrow({ where: { id: recipientWallet.userId }, select: { fullName: true } }),
    ]);

    const transfer = await tx.walletTransfer.create({
      data: {
        senderId,
        recipientId: recipientWallet.userId,
        amountMinor,
        currency: senderWallet.currency,
        note: input.note,
        status: "COMPLETED",
      },
    });

    // debitWithinTx does the real, atomic "is there enough?" check — the
    // balance read above is only used for currency/id lookups, never to
    // decide whether this transfer is allowed.
    const debited = await debitWithinTx(tx, {
      userId: senderId,
      amountMinor,
      currency: senderWallet.currency,
      type: "TRANSFER",
      description: `Sent to ${recipient.fullName} (${input.recipientAccountNumber})`,
      referenceType: "WALLET_TRANSFER",
      referenceId: transfer.id,
    });
    if (!debited.success) {
      return { ok: false, error: "Insufficient wallet balance." };
    }

    // creditWithinTx converts amountMinor (in the sender's currency) into
    // the recipient's own wallet currency itself — no separate conversion
    // needed here.
    await creditWithinTx(tx, {
      userId: recipientWallet.userId,
      amountMinor,
      currency: senderWallet.currency,
      type: "TRANSFER",
      description: `Received from ${sender.fullName}`,
      referenceType: "WALLET_TRANSFER",
      referenceId: transfer.id,
    });

    return { ok: true, transferId: transfer.id };
  });
}

export interface ReverseTransferResult {
  ok: boolean;
  error?: string;
}

/**
 * Admin-only. Reverses both legs using the RECIPIENT's own ledger row for
 * how much to claw back (not a fresh FX conversion) — rates can drift
 * between the original transfer and the reversal, and re-converting now
 * could return a different amount than what was actually credited.
 */
export async function reverseWalletTransfer(
  transferId: string,
  adminUserId: string,
  reason: string,
): Promise<ReverseTransferResult> {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const transfer = await tx.walletTransfer.findUnique({ where: { id: transferId } });
    if (!transfer) return { ok: false, error: "Transfer not found." };
    if (transfer.status === "REVERSED") return { ok: false, error: "This transfer has already been reversed." };

    const recipientWallet = await tx.wallet.findUniqueOrThrow({ where: { userId: transfer.recipientId } });

    const recipientLeg = await tx.walletTransaction.findFirst({
      where: { referenceType: "WALLET_TRANSFER", referenceId: transfer.id, walletId: recipientWallet.id },
    });
    if (!recipientLeg) return { ok: false, error: "Could not find the recipient's ledger entry for this transfer." };
    const recipientCreditedMinor = recipientLeg.amountMinor; // positive, what the recipient actually received

    // Same atomic guard as a normal debit — if the recipient has since
    // spent some of it, this fails cleanly instead of pushing them negative.
    const clawedBack = await debitWithinTx(tx, {
      userId: transfer.recipientId,
      amountMinor: recipientCreditedMinor,
      currency: recipientWallet.currency,
      type: "TRANSFER",
      description: `Reversal: wallet transfer #${transfer.id.slice(-8)} reversed by admin`,
      referenceType: "WALLET_TRANSFER_REVERSAL",
      referenceId: transfer.id,
    });
    if (!clawedBack.success) {
      return { ok: false, error: "The recipient's wallet balance is too low to reverse this transfer — they've likely already spent it." };
    }

    await creditWithinTx(tx, {
      userId: transfer.senderId,
      amountMinor: transfer.amountMinor,
      currency: transfer.currency,
      type: "TRANSFER",
      description: `Reversal: wallet transfer #${transfer.id.slice(-8)} returned to you`,
      referenceType: "WALLET_TRANSFER_REVERSAL",
      referenceId: transfer.id,
    });

    await tx.walletTransfer.update({
      where: { id: transfer.id },
      data: { status: "REVERSED", reversedAt: new Date(), reversedById: adminUserId, reversalReason: reason },
    });

    return { ok: true };
  });
}
