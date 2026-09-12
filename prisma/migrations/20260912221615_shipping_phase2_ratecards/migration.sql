-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "customsRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "internationalShippingAllowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isFragile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHazardous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "packageHeightCm" INTEGER,
ADD COLUMN     "packageLengthCm" INTEGER,
ADD COLUMN     "packageWidthCm" INTEGER,
ADD COLUMN     "shippingCategory" TEXT,
ADD COLUMN     "shippingOriginId" TEXT;

-- CreateTable
CREATE TABLE "ShippingRateCard" (
    "id" TEXT NOT NULL,
    "shippingOriginId" TEXT NOT NULL,
    "destinationCountryId" TEXT NOT NULL,
    "destinationRegion" TEXT,
    "serviceLevelId" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "deliveryDaysMin" INTEGER NOT NULL,
    "deliveryDaysMax" INTEGER NOT NULL,
    "trackingAvailable" BOOLEAN NOT NULL DEFAULT true,
    "markupEnabled" BOOLEAN,
    "markupPercent" INTEGER,
    "markupFixedMinor" INTEGER,
    "handlingFeeMinor" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRateCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRateBracket" (
    "id" TEXT NOT NULL,
    "rateCardId" TEXT NOT NULL,
    "minGrams" INTEGER NOT NULL,
    "maxGrams" INTEGER,
    "basePriceMinor" INTEGER NOT NULL DEFAULT 0,
    "pricePerKgMinor" INTEGER NOT NULL DEFAULT 0,
    "minChargeMinor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRateBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomsSetting" (
    "id" TEXT NOT NULL,
    "destinationCountryId" TEXT NOT NULL,
    "estimatedDutyPercent" INTEGER,
    "importTaxPercent" INTEGER,
    "customsProcessingFeeMinor" INTEGER,
    "currency" TEXT,
    "notes" TEXT,
    "isConfigured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomsSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyRate" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurrencyRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShippingRateCard_isActive_idx" ON "ShippingRateCard"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRateCard_shippingOriginId_destinationCountryId_dest_key" ON "ShippingRateCard"("shippingOriginId", "destinationCountryId", "destinationRegion", "serviceLevelId");

-- CreateIndex
CREATE INDEX "ShippingRateBracket_rateCardId_idx" ON "ShippingRateBracket"("rateCardId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomsSetting_destinationCountryId_key" ON "CustomsSetting"("destinationCountryId");

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyRate_fromCurrency_toCurrency_key" ON "CurrencyRate"("fromCurrency", "toCurrency");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shippingOriginId_fkey" FOREIGN KEY ("shippingOriginId") REFERENCES "ShippingOrigin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRateCard" ADD CONSTRAINT "ShippingRateCard_shippingOriginId_fkey" FOREIGN KEY ("shippingOriginId") REFERENCES "ShippingOrigin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRateCard" ADD CONSTRAINT "ShippingRateCard_destinationCountryId_fkey" FOREIGN KEY ("destinationCountryId") REFERENCES "DestinationCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRateCard" ADD CONSTRAINT "ShippingRateCard_serviceLevelId_fkey" FOREIGN KEY ("serviceLevelId") REFERENCES "ShippingServiceLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRateCard" ADD CONSTRAINT "ShippingRateCard_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRateBracket" ADD CONSTRAINT "ShippingRateBracket_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "ShippingRateCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomsSetting" ADD CONSTRAINT "CustomsSetting_destinationCountryId_fkey" FOREIGN KEY ("destinationCountryId") REFERENCES "DestinationCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

