import "server-only";
import { db } from "@/lib/db";
import { walletService } from "./walletService";
import { reloadlyService } from "./reloadlyService";
import { currencyConversionService } from "./currencyConversionService";
import type { Currency } from "@prisma/client";

export interface PurchaseAirtimeParams {
  userId: string;
  countryIso: string;
  operatorId: number;
  operatorName: string;
  recipientPhone: string;
  // true when `amount` is in the recipient operator's own local currency;
  // false means `amount` is in USD, the universal fallback used whenever
  // the operator's local currency isn't one ATG models (see chargeCurrency).
  useLocalAmount: boolean;
  amount: number; // major units, in `chargeCurrency`
  // The currency `amount` is actually denominated in — the operator's own
  // local currency when useLocalAmount, else "USD". Deliberately NOT
  // inferred from countryIso or walletCurrency: a customer can top up a
  // country other than the one their own wallet currency matches (e.g. a
  // GMD-wallet customer topping up a Nigerian number), so this must be
  // exactly what the operator quoted, not assumed.
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
    useLocalAmount: params.useLocalAmount,
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
