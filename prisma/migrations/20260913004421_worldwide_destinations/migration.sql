-- Worldwide checkout: retire the Nigeria/Gambia-only `Country` enum on every
-- customer/operational destination field, replacing it with a plain ISO
-- string column (e.g. "NG", "GM", "GH") validated against the open-ended
-- `DestinationCountry` reference table at the application layer — the same
-- shape already used by ShippingOrigin.countryIso / OrderShipment.destinationCountryIso.
--
-- Each table below follows expand -> backfill -> contract: add the new
-- column nullable, copy the old enum value across as its 2-letter code,
-- enforce NOT NULL, then drop the old enum column. The legacy `Country`
-- enum type itself is NOT dropped (ShippingRate.destinationCountry, the
-- legacy per-kg rate table, still uses it and is intentionally untouched).

-- ===== CustomerProfile: country -> countryIso =====
ALTER TABLE "CustomerProfile" ADD COLUMN "countryIso" TEXT;
UPDATE "CustomerProfile" SET "countryIso" = CASE "country" WHEN 'NIGERIA' THEN 'NG' WHEN 'GAMBIA' THEN 'GM' END WHERE "countryIso" IS NULL;
ALTER TABLE "CustomerProfile" ALTER COLUMN "countryIso" SET NOT NULL;
ALTER TABLE "CustomerProfile" DROP COLUMN "country";

-- ===== Address: country -> countryIso =====
ALTER TABLE "Address" ADD COLUMN "countryIso" TEXT;
UPDATE "Address" SET "countryIso" = CASE "country" WHEN 'NIGERIA' THEN 'NG' WHEN 'GAMBIA' THEN 'GM' END WHERE "countryIso" IS NULL;
ALTER TABLE "Address" ALTER COLUMN "countryIso" SET NOT NULL;
ALTER TABLE "Address" DROP COLUMN "country";

-- ===== Order: destination -> destinationIso =====
ALTER TABLE "Order" ADD COLUMN "destinationIso" TEXT;
UPDATE "Order" SET "destinationIso" = CASE "destination" WHEN 'NIGERIA' THEN 'NG' WHEN 'GAMBIA' THEN 'GM' END WHERE "destinationIso" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "destinationIso" SET NOT NULL;
ALTER TABLE "Order" DROP COLUMN "destination";

-- ===== ShopForMeRequest: destination -> destinationIso =====
ALTER TABLE "ShopForMeRequest" ADD COLUMN "destinationIso" TEXT;
UPDATE "ShopForMeRequest" SET "destinationIso" = CASE "destination" WHEN 'NIGERIA' THEN 'NG' WHEN 'GAMBIA' THEN 'GM' END WHERE "destinationIso" IS NULL;
ALTER TABLE "ShopForMeRequest" ALTER COLUMN "destinationIso" SET NOT NULL;
ALTER TABLE "ShopForMeRequest" DROP COLUMN "destination";

-- ===== SourcingRequest: destination -> destinationIso =====
ALTER TABLE "SourcingRequest" ADD COLUMN "destinationIso" TEXT;
UPDATE "SourcingRequest" SET "destinationIso" = CASE "destination" WHEN 'NIGERIA' THEN 'NG' WHEN 'GAMBIA' THEN 'GM' END WHERE "destinationIso" IS NULL;
ALTER TABLE "SourcingRequest" ALTER COLUMN "destinationIso" SET NOT NULL;
ALTER TABLE "SourcingRequest" DROP COLUMN "destination";

-- ===== Package: destination -> destinationIso =====
ALTER TABLE "Package" ADD COLUMN "destinationIso" TEXT;
UPDATE "Package" SET "destinationIso" = CASE "destination" WHEN 'NIGERIA' THEN 'NG' WHEN 'GAMBIA' THEN 'GM' END WHERE "destinationIso" IS NULL;
ALTER TABLE "Package" ALTER COLUMN "destinationIso" SET NOT NULL;
ALTER TABLE "Package" DROP COLUMN "destination";

-- ===== Shipment: destinationCountry -> destinationCountryIso =====
ALTER TABLE "Shipment" ADD COLUMN "destinationCountryIso" TEXT;
UPDATE "Shipment" SET "destinationCountryIso" = CASE "destinationCountry" WHEN 'NIGERIA' THEN 'NG' WHEN 'GAMBIA' THEN 'GM' END WHERE "destinationCountryIso" IS NULL;
ALTER TABLE "Shipment" ALTER COLUMN "destinationCountryIso" SET NOT NULL;
ALTER TABLE "Shipment" DROP COLUMN "destinationCountry";

-- ===== DeliveryZone: country -> countryIso (compound unique key rebuild) =====
DROP INDEX "DeliveryZone_country_city_key";
ALTER TABLE "DeliveryZone" ADD COLUMN "countryIso" TEXT;
UPDATE "DeliveryZone" SET "countryIso" = CASE "country" WHEN 'NIGERIA' THEN 'NG' WHEN 'GAMBIA' THEN 'GM' END WHERE "countryIso" IS NULL;
ALTER TABLE "DeliveryZone" ALTER COLUMN "countryIso" SET NOT NULL;
ALTER TABLE "DeliveryZone" DROP COLUMN "country";
CREATE UNIQUE INDEX "DeliveryZone_countryIso_city_key" ON "DeliveryZone"("countryIso", "city");

-- ===== Store.supportedDestinations: Country[] -> String[] =====
ALTER TABLE "Store" ADD COLUMN "supportedDestinationsIso" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "Store" SET "supportedDestinationsIso" = COALESCE((
  SELECT array_agg(CASE elem WHEN 'NIGERIA' THEN 'NG' WHEN 'GAMBIA' THEN 'GM' ELSE elem::text END)
  FROM unnest("supportedDestinations") AS elem
), ARRAY[]::TEXT[]);
ALTER TABLE "Store" DROP COLUMN "supportedDestinations";
ALTER TABLE "Store" RENAME COLUMN "supportedDestinationsIso" TO "supportedDestinations";
ALTER TABLE "Store" ALTER COLUMN "supportedDestinations" SET DEFAULT ARRAY['NG', 'GM']::TEXT[];
