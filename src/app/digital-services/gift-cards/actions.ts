"use server";

import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { walletService } from "@/lib/services/walletService";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
import { purchaseGiftCard } from "@/lib/services/digitalServiceOrderService";
import { giftCardPurchaseSchema, type GiftCardPurchaseInput } from "@/lib/validation/schemas";
import type { Currency } from "@prisma/client";

export interface PurchaseGiftCardActionResult {
  ok: boolean;
  error?: string;
  orderId?: string;
}

export async function purchaseGiftCardAction(input: GiftCardPurchaseInput): Promise<PurchaseGiftCardActionResult> {
  const user = await requireUser();
  const parsed = giftCardPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  const wallet = await walletService.getOrCreateWallet(user.id, profile?.preferredCurrency ?? "NGN");

  const result = await purchaseGiftCard({
    userId: user.id,
    countryIso: parsed.data.countryIso,
    productId: parsed.data.productId,
    brandName: parsed.data.brandName,
    recipientEmail: parsed.data.recipientEmail,
    senderName: user.fullName,
    amount: parsed.data.amount,
    chargeCurrency: parsed.data.chargeCurrency,
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
  const debitAmountMinor =
    params.chargeCurrency === wallet.currency
      ? chargeAmountMinor
      : currencyConversionService.convert(chargeAmountMinor, params.chargeCurrency, wallet.currency);

  return { walletCurrency: wallet.currency, walletBalanceMinor: wallet.balanceMinor, debitAmountMinor };
}
