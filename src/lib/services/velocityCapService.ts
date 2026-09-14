import "server-only";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@prisma/client";

/**
 * Caps how much real gateway money (Card/Bank Transfer) a brand-new account
 * can bring in during its first few days — blunts the "fresh account, one
 * large fraudulent hit" pattern specifically. Unlike the bank-transfer name
 * match, this is a hard block, not a flag: review-after-the-fact doesn't
 * help here, since the point is stopping the hit before goods ship, not
 * noticing it afterward.
 *
 * Only currencies Flutterwave actually charges need a cap (GMD customers
 * never reach the gateway — see paymentService.ts). Adjust these numbers as
 * real order volumes make clear what's too tight or too loose; they're the
 * only thing here that should need tuning.
 */
export const NEW_ACCOUNT_WINDOW_DAYS = 7;
const NEW_ACCOUNT_CAP_MINOR: Partial<Record<Currency, number>> = {
  NGN: 30_000_000, // ₦300,000.00
  USD: 20_000, // $200.00
};

export interface VelocityCheckResult {
  allowed: boolean;
  reason?: string;
}

export async function checkVelocityCap(params: {
  userId: string;
  amountMinor: number;
  currency: Currency;
}): Promise<VelocityCheckResult> {
  const cap = NEW_ACCOUNT_CAP_MINOR[params.currency];
  if (!cap) return { allowed: true };

  const user = await db.user.findUnique({ where: { id: params.userId }, select: { createdAt: true } });
  if (!user) return { allowed: true };

  const windowMs = NEW_ACCOUNT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() - user.createdAt.getTime() > windowMs) return { allowed: true };

  // Count PENDING alongside SUCCESSFUL — Bank Transfer payments can sit
  // PENDING for a while before confirming, so only counting SUCCESSFUL would
  // let several near-cap attempts race in before any of them settle.
  const priorAgg = await db.payment.aggregate({
    _sum: { amountMinor: true },
    where: {
      status: { in: ["PENDING", "SUCCESSFUL"] },
      currency: params.currency,
      providerName: "FLUTTERWAVE",
      OR: [{ userId: params.userId }, { order: { userId: params.userId } }],
    },
  });
  const priorTotal = priorAgg._sum.amountMinor ?? 0;

  if (priorTotal + params.amountMinor > cap) {
    return {
      allowed: false,
      reason: `New accounts are limited to ${formatMoney(cap, params.currency)} in Card/Bank Transfer payments during their first ${NEW_ACCOUNT_WINDOW_DAYS} days. Please pay from your ATG Wallet, or contact support to lift this limit.`,
    };
  }

  return { allowed: true };
}
