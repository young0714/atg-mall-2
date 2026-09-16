"use server";

import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { walletService } from "@/lib/services/walletService";
import {
  lookupRecipientByAccountNumber,
  resolveWalletTransfer,
  executeWalletTransfer,
} from "@/lib/services/walletTransferService";
import { createCheckoutOtp, verifyCheckoutOtp } from "@/lib/services/otpService";
import { walletTransferSchema, type WalletTransferInput } from "@/lib/validation/schemas";
import type { Currency } from "@prisma/client";

export interface WalletBalancePreview {
  walletCurrency: Currency;
  walletBalanceMinor: number;
}

/** Fetched fresh each time the Send flow reaches the confirm step, rather than trusting a stale page-load prop. */
export async function previewWalletBalanceAction(): Promise<WalletBalancePreview> {
  const user = await requireUser();
  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  const wallet = await walletService.getOrCreateWallet(user.id, profile?.preferredCurrency ?? "NGN");
  return { walletCurrency: wallet.currency, walletBalanceMinor: wallet.balanceMinor };
}

export interface LookupRecipientResult {
  ok: boolean;
  recipientName?: string;
  error?: string;
}

/** Read-only lookup so the Send flow can show "Sending to: [Name]" before anything is committed. */
export async function lookupRecipientAction(accountNumber: string): Promise<LookupRecipientResult> {
  const user = await requireUser();
  const result = await lookupRecipientByAccountNumber(accountNumber, user.id);
  return result.ok ? { ok: true, recipientName: result.recipientName } : { ok: false, error: result.error };
}

export interface InitiateOtpResult {
  ok: boolean;
  otpId?: string;
  email?: string;
  error?: string;
}

/** Validates the transfer and emails a verification code — nothing is sent yet. */
export async function initiateWalletTransferOtpAction(input: WalletTransferInput): Promise<InitiateOtpResult> {
  const user = await requireUser();
  const parsed = walletTransferSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid transfer details" };
  }

  const resolved = await resolveWalletTransfer(user.id, parsed.data);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const { otpId } = await createCheckoutOtp({
    userId: user.id,
    email: user.email,
    purpose: "WALLET_TRANSFER",
    payload: parsed.data,
    actionDescription: `send money to ${resolved.recipientName}`,
  });

  return { ok: true, otpId, email: user.email };
}

export interface ConfirmTransferResult {
  ok: boolean;
  error?: string;
  transferId?: string;
}

/** Verifies the code, then — only then — re-validates and actually moves the money. */
export async function confirmWalletTransferOtpAction(otpId: string, code: string): Promise<ConfirmTransferResult> {
  const user = await requireUser();
  const verified = await verifyCheckoutOtp({ otpId, code, userId: user.id });
  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }

  const result = await executeWalletTransfer(user.id, verified.payload);
  return result.ok
    ? { ok: true, transferId: result.transferId }
    : { ok: false, error: result.error ?? "This transfer could not be completed." };
}
