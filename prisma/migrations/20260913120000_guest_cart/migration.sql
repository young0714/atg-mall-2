-- Cart.userId becomes optional, and a guestToken column is added, so an
-- anonymous visitor can add products to cart and browse/edit their cart
-- freely, before ever logging in, registering, or continuing as a guest —
-- those only happen at checkout. A cart always has exactly one of
-- userId/guestToken set (enforced at the application layer).
ALTER TABLE "Cart" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Cart" ADD COLUMN "guestToken" TEXT;
CREATE UNIQUE INDEX "Cart_guestToken_key" ON "Cart"("guestToken");
