import "server-only";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@prisma/client";

/**
 * Caps how much an unverified account can put into its ATG Wallet per
 * calendar month — money laundering via wallet top-ups specifically,
 * since a deposit creates a flexible, reusable, undelivered balance, unlike
 * an order payment which is already tied to a specific order and delivery
 * address (see the isWalletDeposit check in paymentService.ts). Cumulative,
 * not per-transaction, so splitting a large deposit into several smaller
 * ones doesn't get around it.
 *
 * A verified BVN (User.bvnVerifiedAt) removes the NGN limit entirely — see
 * the account's wallet page for how a customer verifies. That verification
 * flow doesn't exist yet, so no account can currently become verified; this
 * cap applies to everyone in the meantime, which is expected, not a bug.
 *
 * Replaces the earlier new-account-only velocity cap: this covers more
 * ground (every account, indefinitely) and has a self-service way out,
 * where the old one was a dead end past "contact support."
 *
 * Unlike the bank-transfer name match, this is a hard block, not a flag:
 * review-after-the-fact doesn't help here, since the point is stopping the
 * deposit before it can be spent, not noticing it afterward.
 *
 * Only currencies Flutterwave actually charges need a cap (GMD customers
 * never reach the gateway — see paymentService.ts). USD has no BVN
 * equivalent to verify against, so it keeps a flat monthly ceiling with no
 * unlock; NGN is the only currency with the unlimited-once-verified path.
 */
const MONTHLY_CAP_MINOR: Partial<Record<Currency, number>> = {
  NGN: 50_000_000, // ₦500,000.00
  USD: 20_000, // $200.00 — no verification path, so this stays a hard ceiling
};

export interface DepositLimitResult {
  allowed: boolean;
  reason?: string;
}

export async function checkDepositLimit(params: {
  userId: string;
  amountMinor: number;
  currency: Currency;
}): Promise<DepositLimitResult> {
  const cap = MONTHLY_CAP_MINOR[params.currency];
  if (!cap) return { allowed: true };

  const user = await db.user.findUnique({ where: { id: params.userId }, select: { bvnVerifiedAt: true } });
  if (!user) return { allowed: true };

  if (params.currency === "NGN" && user.bvnVerifiedAt) return { allowed: true };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Count PENDING alongside SUCCESSFUL — Bank Transfer payments can sit
  // PENDING for a while before confirming, so only counting SUCCESSFUL would
  // let several near-cap attempts race in before any of them settle. Only
  // wallet-deposit payments count (orderId is always null for those — see
  // the Payment model) since order payments are a separate, uncapped flow.
  const monthAgg = await db.payment.aggregate({
    _sum: { amountMinor: true },
    where: {
      status: { in: ["PENDING", "SUCCESSFUL"] },
      currency: params.currency,
      providerName: "FLUTTERWAVE",
      userId: params.userId,
      orderId: null,
      createdAt: { gte: monthStart },
    },
  });
  const monthTotal = monthAgg._sum.amountMinor ?? 0;

  if (monthTotal + params.amountMinor > cap) {
    const unlockNote = params.currency === "NGN" ? " Verify your BVN to remove this limit." : "";
    return {
      allowed: false,
      reason: `Unverified accounts are limited to ${formatMoney(cap, params.currency)} in wallet top-ups per calendar month.${unlockNote}`,
    };
  }

  return { allowed: true };
}
