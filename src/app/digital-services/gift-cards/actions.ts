"use server";

import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { walletService } from "@/lib/services/walletService";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
import { purchaseGiftCard } from "@/lib/services/digitalServiceOrderService";
import { calculateGiftCardFeeMinor } from "@/lib/services/digitalServiceFeeService";
import { createCheckoutOtp, verifyCheckoutOtp } from "@/lib/services/otpService";
import { giftCardPurchaseSchema, type GiftCardPurchaseInput } from "@/lib/validation/schemas";
import type { Currency } from "@prisma/client";

export interface PurchaseGiftCardActionResult {
  ok: boolean;
  error?: string;
  orderId?: string;
}

export interface InitiateOtpResult {
  ok: boolean;
  otpId?: string;
  email?: string;
  error?: string;
}

/** Validates the order and emails a verification code — nothing is charged yet. */
export async function initiateGiftCardOtpAction(input: GiftCardPurchaseInput): Promise<InitiateOtpResult> {
  const user = await requireUser();
  const parsed = giftCardPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const { otpId } = await createCheckoutOtp({
    userId: user.id,
    email: user.email,
    purpose: "DIGITAL_SERVICE_GIFT_CARD",
    payload: parsed.data,
    actionDescription: "complete your gift card order",
  });

  return { ok: true, otpId, email: user.email };
}

/** Verifies the code, then — only then — actually debits the wallet and orders the gift card. */
export async function confirmGiftCardOtpAction(otpId: string, code: string): Promise<PurchaseGiftCardActionResult> {
  const user = await requireUser();
  const verified = await verifyCheckoutOtp({ otpId, code, userId: user.id });
  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }

  const payload = verified.payload as GiftCardPurchaseInput;
  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  const wallet = await walletService.getOrCreateWallet(user.id, profile?.preferredCurrency ?? "NGN");

  const result = await purchaseGiftCard({
    userId: user.id,
    countryIso: payload.countryIso,
    productId: payload.productId,
    brandName: payload.brandName,
    recipientEmail: payload.recipientEmail,
    senderName: user.fullName,
    amount: payload.amount,
    chargeCurrency: payload.chargeCurrency,
    walletCurrency: wallet.currency,
  });

  return result.ok
    ? { ok: true, orderId: result.orderId }
    : { ok: false, error: result.failureReason ?? "The gift card order could not be completed.", orderId: result.orderId };
}

export interface WalletChargePreview {
  walletCurrency: Currency;
  walletBalanceMinor: number;
  debitAmountMinor: number;
  feeMinor: number;
}

/** Used by the Review step to show what a purchase would actually debit from the customer's wallet, before they confirm. */
export async function previewGiftCardChargeAction(params: {
  amount: number;
  chargeCurrency: Currency;
}): Promise<WalletChargePreview> {
  const user = await requireUser();
  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  const wallet = await walletService.getOrCreateWallet(user.id, profile?.preferredCurrency ?? "NGN");

  const chargeAmountMinor = Math.round(params.amount * 100);
  const feeAmountMinor = calculateGiftCardFeeMinor(chargeAmountMinor, params.chargeCurrency);
  const totalChargeAmountMinor = chargeAmountMinor + feeAmountMinor;

  const debitAmountMinor =
    params.chargeCurrency === wallet.currency
      ? totalChargeAmountMinor
      : currencyConversionService.convert(totalChargeAmountMinor, params.chargeCurrency, wallet.currency);
  const faceValueDebitMinor =
    params.chargeCurrency === wallet.currency
      ? chargeAmountMinor
      : currencyConversionService.convert(chargeAmountMinor, params.chargeCurrency, wallet.currency);

  return {
    walletCurrency: wallet.currency,
    walletBalanceMinor: wallet.balanceMinor,
    debitAmountMinor,
    feeMinor: debitAmountMinor - faceValueDebitMinor,
  };
}
