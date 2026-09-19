import type { SourcePlatform, FulfillmentType } from "@prisma/client";

// Display labels for SourcePlatform — the enum's own values predate this
// business taxonomy (MOCK_1688/MOCK_TAOBAO/ALIBABA/SELLER), so this maps
// them onto the six product sources ATG Mall actually sells through
// without renaming the enum (renaming would touch every existing row).
export const SOURCE_PLATFORM_LABELS: Record<SourcePlatform, string> = {
  ATG: "ATG",
  SELLER: "Vendor",
  MOCK_1688: "China (1688)",
  MOCK_TAOBAO: "Taobao",
  ALIBABA: "International Supplier",
  AFFILIATE: "Affiliate",
  USA_STORE: "USA Store",
  UK_STORE: "UK Store",
  INTERNATIONAL_STORE: "International Store",
  CJDROPSHIPPING: "CJdropshipping",
  ALIEXPRESS: "AliExpress",
  MATTERHORN: "Matterhorn",
};

export const FULFILLMENT_TYPE_LABELS: Record<FulfillmentType, string> = {
  ATG_INVENTORY: "ATG Inventory",
  VENDOR: "Vendor Fulfillment",
  CHINA_SOURCING: "China Sourcing",
  INTERNATIONAL_SOURCING: "International Sourcing",
  AFFILIATE: "Affiliate",
};

export function sourcePlatformLabel(platform: SourcePlatform): string {
  return SOURCE_PLATFORM_LABELS[platform] ?? platform;
}

// Customer-facing variant of sourcePlatformLabel. Most platforms (1688,
// Taobao, USA/UK Store, etc.) are already part of ATG's own "Shop from
// China/USA/UK" marketing story, so naming them is fine — CJdropshipping
// is purely an internal fulfillment detail, not something ATG markets
// itself around, so showing it by name would just point customers at a
// specific competing supplier. Admin pages should keep using
// sourcePlatformLabel directly; this is only for customer-visible pages.
export function customerFacingSourceLabel(platform: SourcePlatform): string {
  if (platform === "CJDROPSHIPPING" || platform === "ALIEXPRESS" || platform === "MATTERHORN") return "ATG Sourced";
  return sourcePlatformLabel(platform);
}

export function fulfillmentTypeLabel(type: FulfillmentType): string {
  return FULFILLMENT_TYPE_LABELS[type] ?? type;
}
