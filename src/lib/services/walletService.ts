import "server-only";
import { db } from "@/lib/db";
import { currencyConversionService } from "./currencyConversionService";
import { generateUniqueAccountNumber } from "./walletAccountNumberService";
import type { Currency, WalletTransactionType, Prisma } from "@prisma/client";

/**
 * WalletService — the ONLY code path allowed to change a wallet balance.
 * Every call appends a `WalletTransaction` row inside the same DB
 * transaction that updates the cached `Wallet.balanceMinor`, so the balance
 * is always reconstructable from the ledger. Never call `db.wallet.update`
 * on `balanceMinor` from anywhere else in the codebase.
 *
 * A wallet's own currency is fixed at creation and never changes on its
 * own — e.g. a customer updating their profile's country/currency later
 * must NOT retroactively relabel their existing balance (that would
 * silently change what the money is actually worth). Because of that, the
 * amount a caller wants to credit/debit is very often in a *different*
 * currency than the wallet itself (an order placed after a customer moved
 * countries, for example) — every credit/debit here takes the amount's own
 * currency and converts it to the wallet's currency before touching the
 * balance, rather than assuming they already match.
 *
 * `debitWithinTx`/`creditWithinTx` are the actual atomic mutations, and are
 * exported so a caller that needs BOTH legs of a transfer to succeed or
 * fail together (see walletTransferService.ts) can run them inside its own
 * single `db.$transaction`, instead of duplicating this logic. `debit()`/
 * `credit()` below are just those same functions wrapped in their own
 * transaction, for the common single-leg case.
 *
 * The balance check inside `debitWithinTx` is done as one atomic
 * conditional UPDATE (`WHERE balanceMinor >= amount`), not a separate
 * read-then-check-then-write — Postgres re-evaluates that WHERE clause
 * against the current row once any lock it was waiting on clears, so two
 * concurrent debits against a balance that only covers one can never both
 * succeed, closing a race a naive read/check/write is exposed to.
 */

type DebitType = Extract<WalletTransactionType, "PAYMENT" | "ADJUSTMENT" | "TRANSFER">;
type CreditType = Extract<WalletTransactionType, "DEPOSIT" | "REFUND" | "ADJUSTMENT" | "TRANSFER">;

interface DebitParams {
  userId: string;
  amountMinor: number;
  currency: Currency;
  description: string;
  referenceType?: string;
  referenceId?: string;
  type?: DebitType;
}

interface CreditParams {
  userId: string;
  amountMinor: number;
  currency: Currency;
  type: CreditType;
  description: string;
  referenceType?: string;
  referenceId?: string;
}

interface DebitResult {
  success: boolean;
  reason?: string;
  walletId?: string;
  balanceAfterMinor?: number;
}

export interface WalletService {
  getOrCreateWallet(
    userId: string,
    currency: Currency,
  ): Promise<{ id: string; balanceMinor: number; currency: Currency; accountNumber: string }>;
  credit(params: CreditParams): Promise<void>;
  debit(params: DebitParams): Promise<{ success: boolean; reason?: string }>;
}

export async function debitWithinTx(tx: Prisma.TransactionClient, params: DebitParams): Promise<DebitResult> {
  const { userId, amountMinor, currency, description, referenceType, referenceId, type = "PAYMENT" } = params;
  const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
  const amountInWalletCurrency =
    currency === wallet.currency ? amountMinor : currencyConversionService.convert(amountMinor, currency, wallet.currency);

  // Atomic, race-safe guard: the balance check and the decrement happen as
  // a single conditional UPDATE, so a concurrent debit can never slip past
  // a balance it doesn't actually cover.
  const result = await tx.wallet.updateMany({
    where: { userId, balanceMinor: { gte: amountInWalletCurrency } },
    data: { balanceMinor: { decrement: amountInWalletCurrency } },
  });
  if (result.count === 0) {
    return { success: false, reason: "INSUFFICIENT_FUNDS" };
  }

  const updated = await tx.wallet.findUniqueOrThrow({ where: { userId } });
  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type,
      amountMinor: -amountInWalletCurrency,
      currency: wallet.currency,
      balanceAfterMinor: updated.balanceMinor,
      referenceType,
      referenceId,
      description,
    },
  });
  return { success: true, walletId: wallet.id, balanceAfterMinor: updated.balanceMinor };
}

export async function creditWithinTx(
  tx: Prisma.TransactionClient,
  params: CreditParams,
): Promise<{ walletId: string; balanceAfterMinor: number }> {
  const { userId, amountMinor, currency, type, description, referenceType, referenceId } = params;
  const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
  const amountInWalletCurrency =
    currency === wallet.currency ? amountMinor : currencyConversionService.convert(amountMinor, currency, wallet.currency);

  // Atomic increment — same reasoning as debit's decrement: the arithmetic
  // happens in the database itself, not from a value read earlier in this
  // function, so a concurrent credit can never be silently overwritten.
  await tx.wallet.update({ where: { userId }, data: { balanceMinor: { increment: amountInWalletCurrency } } });

  const updated = await tx.wallet.findUniqueOrThrow({ where: { userId } });
  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type,
      amountMinor: amountInWalletCurrency,
      currency: wallet.currency,
      balanceAfterMinor: updated.balanceMinor,
      referenceType,
      referenceId,
      description,
    },
  });
  return { walletId: wallet.id, balanceAfterMinor: updated.balanceMinor };
}

class LedgerWalletService implements WalletService {
  async getOrCreateWallet(userId: string, currency: Currency) {
    const existing = await db.wallet.findUnique({ where: { userId } });
    if (existing) return existing;
    const accountNumber = await generateUniqueAccountNumber();
    return db.wallet.create({ data: { userId, currency, balanceMinor: 0, accountNumber } });
  }

  async credit(params: CreditParams): Promise<void> {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      await creditWithinTx(tx, params);
    });
  }

  async debit(params: DebitParams): Promise<{ success: boolean; reason?: string }> {
    return db.$transaction(async (tx: Prisma.TransactionClient) => debitWithinTx(tx, params));
  }
}

export const walletService: WalletService = new LedgerWalletService();
