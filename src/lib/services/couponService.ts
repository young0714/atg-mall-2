import "server-only";
import { db } from "@/lib/db";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
import type { Currency } from "@prisma/client";
import { priceWithSale, type SaleRule } from "@/lib/salePricing";
import { evaluateCoupon, isLineEligible, normaliseCode, pickPublicOffer, type CouponRule, type PublicOffer } from "@/lib/couponRules";

export interface CartLineForCoupon {
  product: { noCoupons: boolean; sellerId: string | null; sourcePlatform: string };
  unitPriceMinor: number; // in the ORDER currency (the sale price when the line is on sale)
  quantity: number;
  onSale: boolean; // lines already on sale never get a coupon on top
}

type CartItemForCoupon = {
  quantity: number;
  product: { noCoupons: boolean; sellerId: string | null; sourcePlatform: string; basePriceMinor: number; baseCurrency: Currency };
  variant: { priceDeltaMinor: number } | null;
};

/** Cart items priced exactly as checkout and order placement price them, in the order's currency. */
export function couponLinesFromCart(items: CartItemForCoupon[], currency: Currency, sale: SaleRule | null): CartLineForCoupon[] {
  return items.map((i) => {
    const price = priceWithSale(i.product.basePriceMinor + (i.variant?.priceDeltaMinor ?? 0), i.product, sale);
    return {
      product: { noCoupons: i.product.noCoupons, sellerId: i.product.sellerId, sourcePlatform: i.product.sourcePlatform },
      unitPriceMinor: currencyConversionService.convert(price.saleMinor, i.product.baseCurrency, currency),
      quantity: i.quantity,
      onSale: price.onSale,
    };
  });
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
    .filter((l) => isLineEligible(l.product) && !l.onSale)
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

/** The offer to advertise to this visitor right now (null = nothing to show). Cheap: one tiny query on the few codes marked "show on website". */
export async function getPublicOffer(userId: string | null): Promise<PublicOffer | null> {
  const candidates = await db.coupon.findMany({ where: { showOnSite: true, isActive: true } });
  if (candidates.length === 0) return null;
  const ids = candidates.map((c) => c.id);
  const [counts, mine] = await Promise.all([
    db.couponRedemption.groupBy({ by: ["couponId"], where: { couponId: { in: ids } }, _count: { _all: true } }),
    userId ? db.couponRedemption.findMany({ where: { userId, couponId: { in: ids } }, select: { couponId: true } }) : Promise.resolve([]),
  ]);
  return pickPublicOffer(candidates, {
    now: new Date(),
    redemptionsByCoupon: new Map(counts.map((c) => [c.couponId, c._count._all])),
    redeemedByUser: new Set(mine.map((m) => m.couponId)),
  });
}
