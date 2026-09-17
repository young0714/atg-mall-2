"use server";

import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { walletService } from "@/lib/services/walletService";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
import { purchaseAirtime } from "@/lib/services/digitalServiceOrderService";
import { calculateAirtimeFeeMinor } from "@/lib/services/digitalServiceFeeService";
import { createCheckoutOtp, verifyCheckoutOtp } from "@/lib/services/otpService";
import { airtimePurchaseSchema, type AirtimePurchaseInput } from "@/lib/validation/schemas";
import type { Currency } from "@prisma/client";

export interface PurchaseAirtimeActionResult {
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

/** Validates the purchase and emails a verification code — nothing is charged yet. */
export async function initiateAirtimeOtpAction(input: AirtimePurchaseInput): Promise<InitiateOtpResult> {
  const user = await requireUser();
  const parsed = airtimePurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const isBundle = parsed.data.serviceType === "BUNDLE";
  const { otpId } = await createCheckoutOtp({
    userId: user.id,
    email: user.email,
    purpose: isBundle ? "DIGITAL_SERVICE_BUNDLE" : "DIGITAL_SERVICE_AIRTIME",
    payload: parsed.data,
    actionDescription: isBundle ? "complete your data bundle purchase" : "complete your airtime top-up",
  });

  return { ok: true, otpId, email: user.email };
}

/** Verifies the code, then — only then — actually debits the wallet and delivers the top-up. */
export async function confirmAirtimeOtpAction(otpId: string, code: string): Promise<PurchaseAirtimeActionResult> {
  const user = await requireUser();
  const verified = await verifyCheckoutOtp({ otpId, code, userId: user.id });
  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }

  const payload = verified.payload as AirtimePurchaseInput;
  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  const wallet = await walletService.getOrCreateWallet(user.id, profile?.preferredCurrency ?? "NGN");

  const result = await purchaseAirtime({
    userId: user.id,
    countryIso: payload.countryIso,
    operatorId: payload.operatorId,
    operatorName: payload.operatorName,
    recipientPhone: payload.recipientPhone,
    amount: payload.amount,
    chargeCurrency: payload.chargeCurrency,
    walletCurrency: wallet.currency,
    serviceType: payload.serviceType,
  });

  return result.ok
    ? { ok: true, orderId: result.orderId }
    : { ok: false, error: result.failureReason ?? "The top-up could not be completed.", orderId: result.orderId };
}

export interface WalletChargePreview {
  walletCurrency: Currency;
  walletBalanceMinor: number;
  debitAmountMinor: number;
  feeMinor: number;
}

/** Used by the Review step to show what a purchase would actually debit from the customer's wallet, before they confirm. */
export async function previewAirtimeChargeAction(params: {
  amount: number;
  chargeCurrency: Currency;
}): Promise<WalletChargePreview> {
  const user = await requireUser();
  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  const wallet = await walletService.getOrCreateWallet(user.id, profile?.preferredCurrency ?? "NGN");

  const chargeAmountMinor = Math.round(params.amount * 100);
  const feeAmountMinor = calculateAirtimeFeeMinor(chargeAmountMinor);
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
