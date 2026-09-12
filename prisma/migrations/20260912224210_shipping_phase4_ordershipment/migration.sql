-- CreateEnum
CREATE TYPE "ShippingRateSource" AS ENUM ('MANUAL', 'LIVE_API', 'FALLBACK');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "orderShipmentId" TEXT,
ADD COLUMN     "weightGramsSnapshot" INTEGER;

-- CreateTable
CREATE TABLE "OrderShipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shippingOriginId" TEXT,
    "originNameSnapshot" TEXT NOT NULL,
    "destinationCountryIso" TEXT NOT NULL,
    "carrierId" TEXT,
    "carrierNameSnapshot" TEXT NOT NULL,
    "serviceLevelNameSnapshot" TEXT NOT NULL,
    "actualWeightGrams" INTEGER NOT NULL,
    "volumetricWeightGrams" INTEGER NOT NULL,
    "chargeableWeightGrams" INTEGER NOT NULL,
    "carrierCostMinor" INTEGER NOT NULL,
    "markupMinor" INTEGER NOT NULL DEFAULT 0,
    "handlingFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "customsEstimateMinor" INTEGER,
    "customerPriceMinor" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "estimatedDeliveryDaysMin" INTEGER NOT NULL,
    "estimatedDeliveryDaysMax" INTEGER NOT NULL,
    "rateSource" "ShippingRateSource" NOT NULL DEFAULT 'MANUAL',
    "rawProviderResponse" JSONB,
    "quotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderShipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderShipment_orderId_idx" ON "OrderShipment"("orderId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderShipmentId_fkey" FOREIGN KEY ("orderShipmentId") REFERENCES "OrderShipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderShipment" ADD CONSTRAINT "OrderShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderShipment" ADD CONSTRAINT "OrderShipment_shippingOriginId_fkey" FOREIGN KEY ("shippingOriginId") REFERENCES "ShippingOrigin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderShipment" ADD CONSTRAINT "OrderShipment_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

