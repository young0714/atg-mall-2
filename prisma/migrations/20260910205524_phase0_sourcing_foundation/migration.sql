-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('ATG_INVENTORY', 'VENDOR', 'CHINA_SOURCING', 'INTERNATIONAL_SOURCING', 'AFFILIATE');

-- AlterEnum
ALTER TYPE "SourcePlatform" ADD VALUE 'AFFILIATE';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "affiliateProvider" TEXT,
ADD COLUMN     "affiliateUrl" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "costBasisMinor" INTEGER,
ADD COLUMN     "costCurrency" "Currency",
ADD COLUMN     "fulfillmentType" "FulfillmentType",
ADD COLUMN     "sellerIdSnapshot" TEXT,
ADD COLUMN     "sourcePlatformSnapshot" "SourcePlatform";

-- CreateTable
CREATE TABLE "PricingPolicy" (
    "id" TEXT NOT NULL,
    "serviceFeePercent" INTEGER NOT NULL DEFAULT 8,
    "serviceFeeMinMinorCny" INTEGER NOT NULL DEFAULT 1000,
    "chinaDomesticShippingMinorCny" INTEGER NOT NULL DEFAULT 800,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPolicy_pkey" PRIMARY KEY ("id")
);

