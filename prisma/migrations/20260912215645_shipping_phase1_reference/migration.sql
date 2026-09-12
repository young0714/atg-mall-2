-- CreateTable
CREATE TABLE "DestinationCountry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isoCode" TEXT NOT NULL,
    "region" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinationCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingOrigin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryIso" TEXT NOT NULL,
    "city" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingOrigin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isLiveApiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingServiceLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingServiceLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingGlobalSettings" (
    "id" TEXT NOT NULL,
    "volumetricDivisor" INTEGER NOT NULL DEFAULT 5000,
    "markupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultMarkupPercent" INTEGER NOT NULL DEFAULT 0,
    "defaultMarkupFixedMinor" INTEGER NOT NULL DEFAULT 0,
    "defaultHandlingFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingGlobalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DestinationCountry_isoCode_key" ON "DestinationCountry"("isoCode");

-- CreateIndex
CREATE INDEX "DestinationCountry_isActive_idx" ON "DestinationCountry"("isActive");

-- CreateIndex
CREATE INDEX "ShippingOrigin_isActive_idx" ON "ShippingOrigin"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_code_key" ON "Carrier"("code");

-- CreateIndex
CREATE INDEX "Carrier_isActive_idx" ON "Carrier"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingServiceLevel_name_key" ON "ShippingServiceLevel"("name");

-- Seed data: destination countries (admin can add more any time)
INSERT INTO "DestinationCountry" ("id", "name", "isoCode", "region", "isActive", "updatedAt") VALUES
  ('destctry-gm', 'Gambia', 'GM', 'West Africa', true, CURRENT_TIMESTAMP),
  ('destctry-ng', 'Nigeria', 'NG', 'West Africa', true, CURRENT_TIMESTAMP),
  ('destctry-gb', 'United Kingdom', 'GB', 'Europe', true, CURRENT_TIMESTAMP),
  ('destctry-us', 'United States', 'US', 'North America', true, CURRENT_TIMESTAMP),
  ('destctry-ca', 'Canada', 'CA', 'North America', true, CURRENT_TIMESTAMP),
  ('destctry-gh', 'Ghana', 'GH', 'West Africa', true, CURRENT_TIMESTAMP),
  ('destctry-sn', 'Senegal', 'SN', 'West Africa', true, CURRENT_TIMESTAMP),
  ('destctry-gn', 'Guinea', 'GN', 'West Africa', true, CURRENT_TIMESTAMP),
  ('destctry-sl', 'Sierra Leone', 'SL', 'West Africa', true, CURRENT_TIMESTAMP),
  ('destctry-lr', 'Liberia', 'LR', 'West Africa', true, CURRENT_TIMESTAMP),
  ('destctry-za', 'South Africa', 'ZA', 'Southern Africa', true, CURRENT_TIMESTAMP),
  ('destctry-cn', 'China', 'CN', 'East Asia', true, CURRENT_TIMESTAMP)
ON CONFLICT ("isoCode") DO NOTHING;

-- Seed data: shipping origins, matching the existing StoreCountry values
-- (China/USA/UK) so backfill in Phase 3 can map cleanly.
INSERT INTO "ShippingOrigin" ("id", "name", "countryIso", "city", "isActive", "updatedAt") VALUES
  ('shiporigin-cn', 'China Warehouse', 'CN', 'Guangzhou', true, CURRENT_TIMESTAMP),
  ('shiporigin-us', 'USA Warehouse', 'US', NULL, true, CURRENT_TIMESTAMP),
  ('shiporigin-gb', 'UK Warehouse', 'GB', NULL, true, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Seed data: the "MANUAL" carrier always exists (used by every manually
-- configured rate card); real carriers (DHL/FedEx/etc.) are added by the
-- admin once a live API is actually connected.
INSERT INTO "Carrier" ("id", "name", "code", "isLiveApiEnabled", "isActive", "updatedAt") VALUES
  ('carrier-manual', 'Manual Rate', 'MANUAL', false, true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Seed data: the three service levels named in the request, with the
-- example ordering (cheapest/slowest first).
INSERT INTO "ShippingServiceLevel" ("id", "name", "sortOrder", "isActive", "updatedAt") VALUES
  ('svclevel-economy', 'Economy', 1, true, CURRENT_TIMESTAMP),
  ('svclevel-standard', 'Standard', 2, true, CURRENT_TIMESTAMP),
  ('svclevel-express', 'Express', 3, true, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Seed data: the one global-settings row. volumetricDivisor=5000 matches
-- the value shippingService.ts already hardcodes today, so behavior is
-- unchanged until an admin edits it.
INSERT INTO "ShippingGlobalSettings" ("id", "volumetricDivisor", "markupEnabled", "defaultMarkupPercent", "defaultMarkupFixedMinor", "defaultHandlingFeeMinor", "updatedAt")
VALUES ('shipglobal-singleton', 5000, true, 0, 0, 0, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

