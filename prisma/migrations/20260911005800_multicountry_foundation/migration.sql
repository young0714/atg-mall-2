-- CreateEnum
CREATE TYPE "StoreCountry" AS ENUM ('CHINA', 'USA', 'UK');

-- CreateEnum
CREATE TYPE "StoreIntegrationType" AS ENUM ('API', 'AFFILIATE', 'DIRECT_LINK', 'SHOP_FOR_ME', 'FUTURE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SourcePlatform" ADD VALUE 'USA_STORE';
ALTER TYPE "SourcePlatform" ADD VALUE 'UK_STORE';
ALTER TYPE "SourcePlatform" ADD VALUE 'INTERNATIONAL_STORE';

-- DropIndex
DROP INDEX "ShippingRate_destinationCountry_method_key";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "storeId" TEXT;

-- AlterTable
ALTER TABLE "ShopForMeRequest" ADD COLUMN     "storeId" TEXT;

-- AlterTable: expand — add the new columns nullable first so the existing
-- China row's old values can be copied over before those columns are dropped.
ALTER TABLE "PricingPolicy"
  ADD COLUMN     "currency" "Currency",
  ADD COLUMN     "domesticShippingMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN     "originCountry" "StoreCountry",
  ADD COLUMN     "serviceFeeMinMinor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN     "warehouseHandlingFeeMinor" INTEGER NOT NULL DEFAULT 0,
  ALTER COLUMN "serviceFeePercent" SET DEFAULT 0;

-- Backfill the existing (China) row from its old fields while those columns
-- still exist, instead of dropping them first and losing the data.
UPDATE "PricingPolicy"
SET "originCountry" = 'CHINA',
    "currency" = 'CNY',
    "domesticShippingMinor" = "chinaDomesticShippingMinorCny",
    "serviceFeeMinMinor" = "serviceFeeMinMinorCny"
WHERE "originCountry" IS NULL;

-- Contract: now safe to enforce NOT NULL and drop the old China-only-named columns.
ALTER TABLE "PricingPolicy"
  ALTER COLUMN "originCountry" SET NOT NULL,
  ALTER COLUMN "currency" SET NOT NULL,
  DROP COLUMN "chinaDomesticShippingMinorCny",
  DROP COLUMN "serviceFeeMinMinorCny";

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" "StoreCountry" NOT NULL,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "internalBrowsePath" TEXT,
    "description" TEXT,
    "integrationType" "StoreIntegrationType" NOT NULL DEFAULT 'SHOP_FOR_ME',
    "affiliateUrl" TEXT,
    "apiStatus" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "shopForMeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "supportedDestinations" "Country"[] DEFAULT ARRAY['NIGERIA', 'GAMBIA']::"Country"[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- CreateIndex
CREATE INDEX "Store_country_idx" ON "Store"("country");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRate_originCountry_destinationCountry_method_key" ON "ShippingRate"("originCountry", "destinationCountry", "method");

-- CreateIndex
CREATE UNIQUE INDEX "PricingPolicy_originCountry_key" ON "PricingPolicy"("originCountry");

-- Seed USA/UK pricing policy rows with honest zero placeholders — not
-- invented real-world figures. Admin fills in actual values at
-- /admin/settings once ATG has real USA/UK sourcing costs to enter.
INSERT INTO "PricingPolicy" ("id", "originCountry", "currency", "domesticShippingMinor", "serviceFeePercent", "serviceFeeMinMinor", "warehouseHandlingFeeMinor", "updatedAt")
VALUES
  ('pricingpolicy-usa-seed', 'USA', 'USD', 0, 0, 0, 0, CURRENT_TIMESTAMP),
  ('pricingpolicy-uk-seed', 'UK', 'GBP', 0, 0, 0, 0, CURRENT_TIMESTAMP)
ON CONFLICT ("originCountry") DO NOTHING;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopForMeRequest" ADD CONSTRAINT "ShopForMeRequest_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

