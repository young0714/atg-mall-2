import type { SourcePlatform, StoreCountry } from "@prisma/client";

/**
 * Bridges the typed `StoreCountry` enum (used by `Store`)
 * and `ShippingRate.originCountry`, which stays a plain string for backward
 * compatibility with the 9 production rows that already exist as "China" —
 * see ARCHITECTURE notes in schema.prisma. Never widen ShippingRate itself
 * to the enum; convert here instead.
 */
export function storeCountryToShippingOrigin(country: StoreCountry): string {
  switch (country) {
    case "CHINA":
      return "China";
    case "USA":
      return "USA";
    case "UK":
      return "UK";
  }
}

/**
 * Derives the sourcing origin for a product's landed-cost calculation from
 * its `sourcePlatform`, so existing call sites that don't pass an explicit
 * origin keep computing exactly as before (everything but the new USA/UK
 * store platforms defaults to China, matching current behavior).
 */
export function sourcePlatformToStoreCountry(sourcePlatform: SourcePlatform): StoreCountry {
  if (sourcePlatform === "USA_STORE") return "USA";
  if (sourcePlatform === "UK_STORE") return "UK";
  return "CHINA";
}

/**
 * StoreCountry -> the ISO code used by the new shipping engine's
 * `ShippingOrigin.countryIso` / `DestinationCountry.isoCode` (seeded in
 * Phase 1 as CN/US/GB for the China/USA/UK warehouses). Used to backfill
 * `Product.shippingOriginId` and by the shipping calculation service.
 */
export function storeCountryToIsoCode(country: StoreCountry): string {
  switch (country) {
    case "CHINA":
      return "CN";
    case "USA":
      return "US";
    case "UK":
      return "GB";
  }
}
