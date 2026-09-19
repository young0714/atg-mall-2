ALTER TABLE "Shipment" ADD COLUMN "carrierId" TEXT;
ALTER TABLE "Shipment" ADD COLUMN "carrierTrackingNumber" TEXT;

CREATE INDEX "Shipment_carrierId_idx" ON "Shipment"("carrierId");

ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
