"use server";

import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { walletService } from "@/lib/services/walletService";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
import { purchaseUtilityBill } from "@/lib/services/digitalServiceOrderService";
import { utilityBillPurchaseSchema, type UtilityBillPurchaseInput } from "@/lib/validation/schemas";
import type { Currency } from "@prisma/client";

export interface PurchaseUtilityBillActionResult {
  ok: boolean;
  error?: string;
  orderId?: string;
}

export async function purchaseUtilityBillAction(input: UtilityBillPurchaseInput): Promise<PurchaseUtilityBillActionResult> {
  const user = await requireUser();
  const parsed = utilityBillPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  const wallet = await walletService.getOrCreateWallet(user.id, profile?.preferredCurrency ?? "NGN");

  const result = await purchaseUtilityBill({
    userId: user.id,
    countryIso: parsed.data.countryIso,
    billerId: parsed.data.billerId,
    billerName: parsed.data.billerName,
    subscriberAccountNumber: parsed.data.subscriberAccountNumber,
    amount: parsed.data.amount,
    chargeCurrency: parsed.data.chargeCurrency,
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
