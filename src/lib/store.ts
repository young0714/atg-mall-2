import type { StoreCountry, StoreIntegrationType } from "@prisma/client";

export const STORE_COUNTRY_LABELS: Record<StoreCountry, string> = {
  CHINA: "China",
  USA: "USA",
  UK: "UK",
};

export const STORE_COUNTRY_FLAGS: Record<StoreCountry, string> = {
  CHINA: "🇨🇳",
  USA: "🇺🇸",
  UK: "🇬🇧",
};

// What each integration type honestly means to a customer — never implies
// more than what's actually connected. See Store.apiStatus for a per-store
// free-text note (e.g. "Mock demo data — pending authorized API").
export const STORE_INTEGRATION_TYPE_LABELS: Record<StoreIntegrationType, string> = {
  API: "Live catalog",
  AFFILIATE: "Affiliate",
  DIRECT_LINK: "External link",
  SHOP_FOR_ME: "Shop for Me",
  FUTURE: "Coming Soon",
};

export function storeCountryLabel(country: StoreCountry): string {
  return STORE_COUNTRY_LABELS[country] ?? country;
}

export function storeIntegrationTypeLabel(type: StoreIntegrationType): string {
  return STORE_INTEGRATION_TYPE_LABELS[type] ?? type;
}
