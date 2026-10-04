-- CreateEnum
CREATE TYPE "CouponWindowType" AS ENUM ('FIXED_DATES', 'SINCE_SIGNUP');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "noCoupons" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponCodeSnapshot" TEXT,
ADD COLUMN     "couponId" TEXT,
ADD COLUMN     "discountMinor" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "windowType" "CouponWindowType" NOT NULL DEFAULT 'FIXED_DATES',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "daysAfterSignup" INTEGER,
    "maxRedemptions" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "discountMinor" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_couponId_userId_key" ON "CouponRedemption"("couponId", "userId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
