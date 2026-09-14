-- Coupon was never actually applied anywhere in checkout or order logic —
-- admin could create codes, but nothing ever redeemed one against a real
-- order. Dead feature, removed along with its admin UI.
DROP TABLE "Coupon";
DROP TYPE "CouponType";
