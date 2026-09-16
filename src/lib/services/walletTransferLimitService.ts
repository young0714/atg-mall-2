import "server-only";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@prisma/client";

/**
 * Caps how much an unverified account can SEND via wallet-to-wallet
 * transfers per calendar month — the same laundering concern as
 * depositLimitService.ts (compromise an account, move the balance out fast
 * before anyone catches it), but for the outbound-transfer vector instead
 * of the deposit vector. Same cap, same BVN-verification unlock, so the
 * mental model a customer already has from the wallet page carries over.
 */
const MONTHLY_CAP_MINOR: Partial<Record<Currency, number>> = {
  NGN: 50_000_000, // ₦500,000.00
  USD: 20_000, // $200.00 — no verification path, so this stays a hard ceiling
};

export interface TransferLimitResult {
  allowed: boolean;
  reason?: string;
}

export async function checkTransferLimit(params: {
  userId: string;
  amountMinor: number;
  currency: Currency;
}): Promise<TransferLimitResult> {
  const cap = MONTHLY_CAP_MINOR[params.currency];
  if (!cap) return { allowed: true };

  const user = await db.user.findUnique({ where: { id: params.userId }, select: { bvnVerifiedAt: true } });
  if (!user) return { allowed: true };

  if (params.currency === "NGN" && user.bvnVerifiedAt) return { allowed: true };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Only COMPLETED transfers count — a reversed one means the money came
  // back, so it shouldn't still occupy the sender's monthly allowance.
  const monthAgg = await db.walletTransfer.aggregate({
    _sum: { amountMinor: true },
    where: {
      senderId: params.userId,
      currency: params.currency,
      status: "COMPLETED",
      createdAt: { gte: monthStart },
    },
  });
  const monthTotal = monthAgg._sum.amountMinor ?? 0;

  if (monthTotal + params.amountMinor > cap) {
    const unlockNote = params.currency === "NGN" ? " Verify your BVN to remove this limit." : "";
    return {
      allowed: false,
      reason: `Unverified accounts are limited to ${formatMoney(cap, params.currency)} in wallet transfers sent per calendar month.${unlockNote}`,
    };
  }

  return { allowed: true };
}
