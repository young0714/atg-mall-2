import "server-only";
import { db } from "@/lib/db";
import { evaluateCoupon, isLineEligible, normaliseCode, type CouponRule } from "@/lib/couponRules";

export interface CartLineForCoupon {
  product: { noCoupons: boolean; sellerId: string | null; sourcePlatform: string };
  unitPriceMinor: number; // in the ORDER currency
  quantity: number;
}

export type CouponCheck =
  | { ok: true; couponId: string; code: string; percentOff: number; discountMinor: number; eligibleMinor: number }
  | { ok: false; error: string };

/**
 * Looks up the code and applies every rule for this customer and cart. Used for
 * the live checkout preview, again when the order is validated, and again inside
 * order placement — never trusts what the browser said earlier.
 */
export async function checkCouponForCart(params: { userId: string; code: string; lines: CartLineForCoupon[] }): Promise<CouponCheck> {
  const code = normaliseCode(params.code);
  const coupon = code ? await db.coupon.findUnique({ where: { code } }) : null;
  const user = await db.user.findUnique({ where: { id: params.userId }, select: { createdAt: true } });
  if (!user) return { ok: false, error: "Sign in to use a code." };

  const [totalRedemptions, mine] = coupon
    ? await Promise.all([
        db.couponRedemption.count({ where: { couponId: coupon.id } }),
        db.couponRedemption.findUnique({ where: { couponId_userId: { couponId: coupon.id, userId: params.userId } } }),
      ])
    : [0, null];

  const eligibleSubtotalMinor = params.lines
    .filter((l) => isLineEligible(l.product))
    .reduce((sum, l) => sum + l.unitPriceMinor * l.quantity, 0);

  const rule: CouponRule | null = coupon
    ? {
        code: coupon.code,
        percentOff: coupon.percentOff,
        windowType: coupon.windowType,
        startsAt: coupon.startsAt,
        endsAt: coupon.endsAt,
        daysAfterSignup: coupon.daysAfterSignup,
        maxRedemptions: coupon.maxRedemptions,
        isActive: coupon.isActive,
      }
    : null;

  const verdict = evaluateCoupon(rule, {
    now: new Date(),
    userCreatedAt: user.createdAt,
    totalRedemptions,
    userAlreadyRedeemed: !!mine,
    eligibleSubtotalMinor,
  });
  if (!verdict.ok) return verdict;
  return {
    ok: true,
    couponId: coupon!.id,
    code: coupon!.code,
    percentOff: coupon!.percentOff,
    discountMinor: verdict.discountMinor,
    eligibleMinor: eligibleSubtotalMinor,
  };
}
