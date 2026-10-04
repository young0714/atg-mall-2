-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "showCountdown" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showOnSite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "siteHeadline" TEXT;
