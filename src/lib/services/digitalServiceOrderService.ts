import "server-only";
import { db } from "@/lib/db";
import { walletService } from "./walletService";
import { reloadlyService } from "./reloadlyService";
import { giftCardService } from "./reloadlyGiftCardService";
import { utilityService } from "./reloadlyUtilityService";
import { currencyConversionService } from "./currencyConversionService";
import {
  calculateAirtimeFeeMinor,
  calculateGiftCardFeeMinor,
  calculateUtilityBillFeeMinor,
} from "./digitalServiceFeeService";
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
  const feeAmountMinor = calculateAirtimeFeeMinor(chargeAmountMinor);
  const totalChargeAmountMinor = chargeAmountMinor + feeAmountMinor;

  // Convert face value and the fee-inclusive total separately (rather than
  // converting the fee on its own) so feeMinor below is exact — the total
  // minus face value, no compounding rounding drift from two conversions.
  const debitAmountMinor =
    params.chargeCurrency === params.walletCurrency
      ? totalChargeAmountMinor
      : currencyConversionService.convert(totalChargeAmountMinor, params.chargeCurrency, params.walletCurrency);
  const faceValueDebitMinor =
    params.chargeCurrency === params.walletCurrency
      ? chargeAmountMinor
      : currencyConversionService.convert(chargeAmountMinor, params.chargeCurrency, params.walletCurrency);
  const feeMinor = debitAmountMinor - faceValueDebitMinor;

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
      feeMinor,
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
    // Store Reloadly's actual message for admin (e.g. their own account
    // balance being the real cause — "your wallet" there means THEIR
    // balance with Reloadly, not the customer's ATG wallet) but never show
    // that raw text to the customer, who'd misread it as their own problem.
    const rawReason = result.failureReason ?? "The top-up could not be completed.";
    await db.digitalServiceOrder.update({ where: { id: order.id }, data: { status: "FAILED", failureReason: rawReason } });
    return { ok: false, orderId: order.id, failureReason: "This top-up couldn't be completed right now. Please try again shortly." };
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
  const feeAmountMinor = calculateGiftCardFeeMinor(chargeAmountMinor, params.chargeCurrency);
  const totalChargeAmountMinor = chargeAmountMinor + feeAmountMinor;

  const debitAmountMinor =
    params.chargeCurrency === params.walletCurrency
      ? totalChargeAmountMinor
      : currencyConversionService.convert(totalChargeAmountMinor, params.chargeCurrency, params.walletCurrency);
  const faceValueDebitMinor =
    params.chargeCurrency === params.walletCurrency
      ? chargeAmountMinor
      : currencyConversionService.convert(chargeAmountMinor, params.chargeCurrency, params.walletCurrency);
  const feeMinor = debitAmountMinor - faceValueDebitMinor;

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
      feeMinor,
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
    // Store Reloadly's actual message for admin, but never show that raw
    // text to the customer — see the identical comment in purchaseAirtime().
    const rawReason = result.failureReason ?? "The gift card order could not be completed.";
    await db.digitalServiceOrder.update({ where: { id: order.id }, data: { status: "FAILED", failureReason: rawReason } });
    return { ok: false, orderId: order.id, failureReason: "This gift card order couldn't be completed right now. Please try again shortly." };
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

export interface PurchaseUtilityBillParams {
  userId: string;
  countryIso: string;
  billerId: number;
  billerName: string;
  subscriberAccountNumber: string;
  amount: number; // major units, in `chargeCurrency`
  chargeCurrency: Currency;
  walletCurrency: Currency;
}

export interface PurchaseUtilityBillResult {
  ok: boolean;
  orderId: string;
  failureReason?: string;
}

/**
 * Same debit-first-then-reverse-on-failure shape as purchaseAirtime() and
 * purchaseGiftCard(). Reloadly's /pay response includes a `status` that may
 * mean "still processing" rather than a final result (per their docs'
 * finalStatusAvailabilityAt field) — this first pass treats any response
 * that returns a transaction id as SUCCESSFUL and records the raw status
 * for admin visibility, without a reconciliation/polling step yet.
 */
export async function purchaseUtilityBill(params: PurchaseUtilityBillParams): Promise<PurchaseUtilityBillResult> {
  const chargeAmountMinor = Math.round(params.amount * 100);
  const feeAmountMinor = calculateUtilityBillFeeMinor(chargeAmountMinor);
  const totalChargeAmountMinor = chargeAmountMinor + feeAmountMinor;

  const debitAmountMinor =
    params.chargeCurrency === params.walletCurrency
      ? totalChargeAmountMinor
      : currencyConversionService.convert(totalChargeAmountMinor, params.chargeCurrency, params.walletCurrency);
  const faceValueDebitMinor =
    params.chargeCurrency === params.walletCurrency
      ? chargeAmountMinor
      : currencyConversionService.convert(chargeAmountMinor, params.chargeCurrency, params.walletCurrency);
  const feeMinor = debitAmountMinor - faceValueDebitMinor;

  const order = await db.digitalServiceOrder.create({
    data: {
      userId: params.userId,
      type: "UTILITY_BILL",
      status: "PENDING",
      countryIso: params.countryIso,
      operatorId: params.billerId,
      operatorName: params.billerName,
      subscriberAccountNumber: params.subscriberAccountNumber,
      amountMinor: debitAmountMinor,
      feeMinor,
      currency: params.walletCurrency,
    },
  });

  const debit = await walletService.debit({
    userId: params.userId,
    amountMinor: debitAmountMinor,
    currency: params.walletCurrency,
    description: `${params.billerName} bill payment — ${params.subscriberAccountNumber}`,
    referenceType: "DIGITAL_SERVICE_ORDER",
    referenceId: order.id,
  });

  if (!debit.success) {
    const failureReason = "Insufficient wallet balance.";
    await db.digitalServiceOrder.update({ where: { id: order.id }, data: { status: "FAILED", failureReason } });
    return { ok: false, orderId: order.id, failureReason };
  }

  const result = await utilityService.payBill({
    billerId: params.billerId,
    subscriberAccountNumber: params.subscriberAccountNumber,
    amount: params.amount,
  });

  if (!result.ok) {
    await walletService.credit({
      userId: params.userId,
      amountMinor: debitAmountMinor,
      currency: params.walletCurrency,
      type: "REFUND",
      description: `Refund: ${params.billerName} bill payment failed`,
      referenceType: "DIGITAL_SERVICE_ORDER",
      referenceId: order.id,
    });
    // Store Reloadly's actual message for admin, but never show that raw
    // text to the customer — see the identical comment in purchaseAirtime().
    const rawReason = result.failureReason ?? "The bill payment could not be completed.";
    await db.digitalServiceOrder.update({ where: { id: order.id }, data: { status: "FAILED", failureReason: rawReason } });
    return { ok: false, orderId: order.id, failureReason: "This bill payment couldn't be completed right now. Please try again shortly." };
  }

  await db.digitalServiceOrder.update({
    where: { id: order.id },
    data: {
      status: "SUCCESSFUL",
      providerRef: result.providerRef,
      validatedCustomerName: result.validatedCustomerName,
      deliveryPayload: result.rawStatus ? ({ rawStatus: result.rawStatus } as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  return { ok: true, orderId: order.id };
}
