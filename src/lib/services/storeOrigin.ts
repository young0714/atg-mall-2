import type { SourcePlatform, StoreCountry } from "@prisma/client";

/**
 * Bridges the typed `StoreCountry` enum (used by `Store`/`PricingPolicy`)
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
