/**
 * Pure coupon rules (no database, no network) — shared by checkout, order
 * placement and the admin screens, and covered by tests.
 *
 * A code takes a percentage off ITEMS only (never shipping). One use per
 * customer. Valid either between fixed dates for everyone, or for N days
 * after each customer's sign-up. Optional cap on total orders.
 */

export type CouponWindowType = "FIXED_DATES" | "SINCE_SIGNUP";

export interface CouponRule {
  code: string;
  percentOff: number;
  windowType: CouponWindowType;
  startsAt: Date | null;
  endsAt: Date | null; // inclusive
  daysAfterSignup: number | null;
  maxRedemptions: number | null;
  isActive: boolean;
}

export interface CouponContext {
  now: Date;
  userCreatedAt: Date;
  totalRedemptions: number;
  userAlreadyRedeemed: boolean;
  eligibleSubtotalMinor: number;
}

export type CouponVerdict = { ok: true; discountMinor: number } | { ok: false; error: string };

export class CouponError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CouponError";
  }
}

export const normaliseCode = (raw: string) => raw.trim().toUpperCase().replace(/\s+/g, "");

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Only ATG's own catalogue is discountable: never a marketplace seller's item (their commission is on the full price), never an excluded product. */
export function isLineEligible(p: { noCoupons: boolean; sellerId: string | null; sourcePlatform: string }): boolean {
  return !p.noCoupons && p.sellerId === null && p.sourcePlatform !== "AFFILIATE";
}

export function discountFor(eligibleMinor: number, percentOff: number): number {
  return Math.round((eligibleMinor * percentOff) / 100);
}

export function evaluateCoupon(coupon: CouponRule | null, ctx: CouponContext): CouponVerdict {
  if (!coupon) return { ok: false, error: "That code isn't valid. Check the spelling and try again." };
  if (!coupon.isActive) return { ok: false, error: "That code isn't active right now." };

  if (coupon.windowType === "FIXED_DATES") {
    if (coupon.startsAt && ctx.now < coupon.startsAt) {
      return { ok: false, error: `That code isn't valid yet. It starts on ${fmt(coupon.startsAt)}.` };
    }
    if (coupon.endsAt && ctx.now > coupon.endsAt) {
      return { ok: false, error: `That code expired on ${fmt(coupon.endsAt)}.` };
    }
  } else {
    const days = coupon.daysAfterSignup ?? 0;
    const lastDay = new Date(ctx.userCreatedAt.getTime() + days * 86_400_000);
    if (ctx.now > lastDay) {
      return { ok: false, error: `This offer was for customers in their first ${days} days after signing up.` };
    }
  }

  if (ctx.userAlreadyRedeemed) return { ok: false, error: "You have already used this code." };
  if (coupon.maxRedemptions !== null && ctx.totalRedemptions >= coupon.maxRedemptions) {
    return { ok: false, error: "This offer has reached its limit." };
  }
  if (ctx.eligibleSubtotalMinor <= 0) {
    return { ok: false, error: "None of the items in your cart can use this code." };
  }
  const discountMinor = discountFor(ctx.eligibleSubtotalMinor, coupon.percentOff);
  if (discountMinor <= 0) return { ok: false, error: "None of the items in your cart can use this code." };
  return { ok: true, discountMinor };
}

/** Plain-English summary shown in the admin list and form. */
export function describeCoupon(c: Pick<CouponRule, "percentOff" | "windowType" | "startsAt" | "endsAt" | "daysAfterSignup" | "maxRedemptions">): string {
  const when =
    c.windowType === "FIXED_DATES"
      ? `from ${c.startsAt ? fmt(c.startsAt) : "now"} to ${c.endsAt ? fmt(c.endsAt) : "no end date"}`
      : `for ${c.daysAfterSignup ?? "?"} days after each customer signs up`;
  return `${c.percentOff}% off items (not shipping) ${when}. One use per customer${c.maxRedemptions ? `, first ${c.maxRedemptions} orders only` : ", no order limit"}.`;
}
