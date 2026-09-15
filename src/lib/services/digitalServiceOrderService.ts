import "server-only";
import { db } from "@/lib/db";
import { walletService } from "./walletService";
import { reloadlyService } from "./reloadlyService";
import { giftCardService } from "./reloadlyGiftCardService";
import { currencyConversionService } from "./currencyConversionService";
import type { Currency, Prisma } from "@prisma/client";

export interface PurchaseAirtimeParams {
  userId: string;
  countryIso: string;
  operatorId: number;
  operatorName: string;
  recipientPhone: string;
  amount: number; // major units, in `chargeCurrency`
  // The currency `amount` is denominated in — Reloadly always quotes
  // operator pricing in that operator's own local currency, so this is
  // whatever AIRTIME_COUNTRIES maps the destination country to. Passed
  // explicitly rather than inferred from countryIso or walletCurrency: a
  // customer's wallet currency doesn't have to match the country they're
  // topping up (e.g. a GMD-wallet customer topping up a Nigerian number).
  chargeCurrency: Currency;
  walletCurrency: Currency;
}

export interface PurchaseAirtimeResult {
  ok: boolean;
  orderId: string;
  failureReason?: string;
}

/**
 * Debits the customer's ATG Wallet, then delivers the top-up via Reloadly.
 * If the top-up fails after a successful debit, the debit is reversed —
 * the customer is never left having paid for a top-up that didn't arrive.
 */
export async function purchaseAirtime(params: PurchaseAirtimeParams): Promise<PurchaseAirtimeResult> {
  const chargeAmountMinor = Math.round(params.amount * 100);
  const debitAmountMinor =
    params.chargeCurrency === params.walletCurrency
      ? chargeAmountMinor
      : currencyConversionService.convert(chargeAmountMinor, params.chargeCurrency, params.walletCurrency);

  const order = await db.digitalServiceOrder.create({
    data: {
      userId: params.userId,
      type: "AIRTIME",
      status: "PENDING",
      countryIso: params.countryIso,
      operatorId: params.operatorId,
      operatorName: params.operatorName,
      recipientPhone: params.recipientPhone,
      amountMinor: debitAmountMinor,
      currency: params.walletCurrency,
    },
  });

  const debit = await walletService.debit({
    userId: params.userId,
    amountMinor: debitAmountMinor,
    currency: params.walletCurrency,
    description: `${params.operatorName} airtime — ${params.recipientPhone}`,
    referenceType: "DIGITAL_SERVICE_ORDER",
    referenceId: order.id,
  });

  if (!debit.success) {
    const failureReason = "Insufficient wallet balance.";
    await db.digitalServiceOrder.update({ where: { id: order.id }, data: { status: "FAILED", failureReason } });
    return { ok: false, orderId: order.id, failureReason };
  }

  const result = await reloadlyService.submitTopup({
    operatorId: params.operatorId,
    countryIso: params.countryIso,
    recipientPhone: params.recipientPhone,
    amount: params.amount,
  });

  if (!result.ok) {
    // The debit already happened — reverse it, the top-up never landed.
    await walletService.credit({
      userId: params.userId,
      amountMinor: debitAmountMinor,
      currency: params.walletCurrency,
      type: "REFUND",
      description: `Refund: ${params.operatorName} airtime failed`,
      referenceType: "DIGITAL_SERVICE_ORDER",
      referenceId: order.id,
    });
    const failureReason = result.failureReason ?? "The top-up could not be completed.";
    await db.digitalServiceOrder.update({ where: { id: order.id }, data: { status: "FAILED", failureReason } });
    return { ok: false, orderId: order.id, failureReason };
  }

  await db.digitalServiceOrder.update({
    where: { id: order.id },
    data: {
      status: "SUCCESSFUL",
      providerRef: result.providerRef,
      deliveredAmountMinor: result.deliveredAmount != null ? Math.round(result.deliveredAmount * 100) : undefined,
      deliveredCurrencyCode: result.deliveredCurrencyCode,
      providerCostMinor: result.costMinor,
    },
  });

  return { ok: true, orderId: order.id };
}

export interface PurchaseGiftCardParams {
  userId: string;
  countryIso: string;
  productId: number;
  brandName: string;
  recipientEmail: string;
  senderName: string;
  amount: number; // major units, in `chargeCurrency` (the product's own currency)
  chargeCurrency: Currency;
  walletCurrency: Currency;
}

export interface PurchaseGiftCardResult {
  ok: boolean;
  orderId: string;
  failureReason?: string;
}

/**
 * Same shape as purchaseAirtime(): debit first, deliver via Reloadly,
 * reverse the debit if delivery fails. Gift cards additionally fetch the
 * redeem code right after a successful order — if that particular call
 * fails (or the code isn't ready yet), the order still stands as
 * SUCCESSFUL (the customer WAS charged and the card WAS ordered) with
 * deliveryPayload left null; there's no retry path for that yet.
 */
export async function purchaseGiftCard(params: PurchaseGiftCardParams): Promise<PurchaseGiftCardResult> {
  const chargeAmountMinor = Math.round(params.amount * 100);
  const debitAmountMinor =
    params.chargeCurrency === params.walletCurrency
      ? chargeAmountMinor
      : currencyConversionService.convert(chargeAmountMinor, params.chargeCurrency, params.walletCurrency);

  const order = await db.digitalServiceOrder.create({
    data: {
      userId: params.userId,
      type: "GIFT_CARD",
      status: "PENDING",
      countryIso: params.countryIso,
      operatorId: params.productId,
      operatorName: params.brandName,
      recipientEmail: params.recipientEmail,
      amountMinor: debitAmountMinor,
      currency: params.walletCurrency,
    },
  });

  const debit = await walletService.debit({
    userId: params.userId,
    amountMinor: debitAmountMinor,
    currency: params.walletCurrency,
    description: `${params.brandName} gift card — ${params.recipientEmail}`,
    referenceType: "DIGITAL_SERVICE_ORDER",
    referenceId: order.id,
  });

  if (!debit.success) {
    const failureReason = "Insufficient wallet balance.";
    await db.digitalServiceOrder.update({ where: { id: order.id }, data: { status: "FAILED", failureReason } });
    return { ok: false, orderId: order.id, failureReason };
  }

  const result = await giftCardService.placeOrder({
    productId: params.productId,
    countryCode: params.countryIso,
    quantity: 1,
    unitPrice: params.amount,
    recipientEmail: params.recipientEmail,
    senderName: params.senderName,
  });

  if (!result.ok) {
    await walletService.credit({
      userId: params.userId,
      amountMinor: debitAmountMinor,
      currency: params.walletCurrency,
      type: "REFUND",
      description: `Refund: ${params.brandName} gift card order failed`,
      referenceType: "DIGITAL_SERVICE_ORDER",
      referenceId: order.id,
    });
    const failureReason = result.failureReason ?? "The gift card order could not be completed.";
    await db.digitalServiceOrder.update({ where: { id: order.id }, data: { status: "FAILED", failureReason } });
    return { ok: false, orderId: order.id, failureReason };
  }

  const redeemCode = result.providerRef ? await giftCardService.getRedeemCode(result.providerRef).catch(() => null) : null;

  await db.digitalServiceOrder.update({
    where: { id: order.id },
    data: {
      status: "SUCCESSFUL",
      providerRef: result.providerRef,
      deliveredAmountMinor: result.deliveredAmount != null ? Math.round(result.deliveredAmount * 100) : undefined,
      deliveredCurrencyCode: result.deliveredCurrencyCode,
      providerCostMinor: result.costMinor,
      deliveryPayload: (redeemCode as unknown as Prisma.InputJsonValue) ?? undefined,
    },
  });

  return { ok: true, orderId: order.id };
}
