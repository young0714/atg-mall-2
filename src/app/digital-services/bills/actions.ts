"use server";

import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { walletService } from "@/lib/services/walletService";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
import { purchaseUtilityBill } from "@/lib/services/digitalServiceOrderService";
import { createCheckoutOtp, verifyCheckoutOtp } from "@/lib/services/otpService";
import { utilityBillPurchaseSchema, type UtilityBillPurchaseInput } from "@/lib/validation/schemas";
import type { Currency } from "@prisma/client";

export interface PurchaseUtilityBillActionResult {
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

/** Validates the payment and emails a verification code — nothing is charged yet. */
export async function initiateUtilityBillOtpAction(input: UtilityBillPurchaseInput): Promise<InitiateOtpResult> {
  const user = await requireUser();
  const parsed = utilityBillPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const { otpId } = await createCheckoutOtp({
    userId: user.id,
    email: user.email,
    purpose: "DIGITAL_SERVICE_UTILITY_BILL",
    payload: parsed.data,
    actionDescription: "complete your bill payment",
  });

  return { ok: true, otpId, email: user.email };
}

/** Verifies the code, then — only then — actually debits the wallet and pays the bill. */
export async function confirmUtilityBillOtpAction(otpId: string, code: string): Promise<PurchaseUtilityBillActionResult> {
  const user = await requireUser();
  const verified = await verifyCheckoutOtp({ otpId, code, userId: user.id });
  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }

  const payload = verified.payload as UtilityBillPurchaseInput;
  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  const wallet = await walletService.getOrCreateWallet(user.id, profile?.preferredCurrency ?? "NGN");

  const result = await purchaseUtilityBill({
    userId: user.id,
    countryIso: payload.countryIso,
    billerId: payload.billerId,
    billerName: payload.billerName,
    subscriberAccountNumber: payload.subscriberAccountNumber,
    amount: payload.amount,
    chargeCurrency: payload.chargeCurrency,
    walletCurrency: wallet.currency,
  });

  return result.ok
    ? { ok: true, orderId: result.orderId }
    : { ok: false, error: result.failureReason ?? "The bill payment could not be completed.", orderId: result.orderId };
}

export interface WalletChargePreview {
  walletCurrency: Currency;
  walletBalanceMinor: number;
  debitAmountMinor: number;
}

/** Used by the Review step to show what a purchase would actually debit from the customer's wallet, before they confirm. */
export async function previewUtilityBillChargeAction(params: {
  amount: number;
  chargeCurrency: Currency;
}): Promise<WalletChargePreview> {
  const user = await requireUser();
  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  const wallet = await walletService.getOrCreateWallet(user.id, profile?.preferredCurrency ?? "NGN");

  const chargeAmountMinor = Math.round(params.amount * 100);
  const debitAmountMinor =
    params.chargeCurrency === wallet.currency
      ? chargeAmountMinor
      : currencyConversionService.convert(chargeAmountMinor, params.chargeCurrency, wallet.currency);

  return { walletCurrency: wallet.currency, walletBalanceMinor: wallet.balanceMinor, debitAmountMinor };
}
