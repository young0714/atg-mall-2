import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(7, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  country: z.enum(["NIGERIA", "GAMBIA"]),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const shopForMeSchema = z.object({
  storeId: z.string().optional(),
  productUrl: z.string().url("Paste a valid product link"),
  productName: z.string().min(2),
  productImageUrl: z.string().url().optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1).max(10000),
  size: z.string().optional(),
  color: z.string().optional(),
  destination: z.enum(["NIGERIA", "GAMBIA"]),
  instructions: z.string().optional(),
});
export type ShopForMeInput = z.infer<typeof shopForMeSchema>;

export const sourcingRequestSchema = z.object({
  productName: z.string().min(2),
  productImageUrl: z.string().url().optional().or(z.literal("")),
  productUrl: z.string().url().optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  targetPriceMinor: z.coerce.number().int().min(0).optional(),
  destination: z.enum(["NIGERIA", "GAMBIA"]),
  notes: z.string().optional(),
});
export type SourcingRequestInput = z.infer<typeof sourcingRequestSchema>;

export const addressSchema = z.object({
  label: z.string().min(1).default("Home"),
  fullName: z.string().min(2),
  phone: z.string().min(7),
  country: z.enum(["NIGERIA", "GAMBIA"]),
  state: z.string().min(1),
  city: z.string().min(1),
  addressLine1: z.string().min(4),
  addressLine2: z.string().optional(),
  landmark: z.string().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const checkoutSchema = z.object({
  addressId: z.string().min(1, "Select a delivery address"),
  shippingMethod: z.enum(["AIR_FREIGHT", "SEA_FREIGHT", "COURIER", "LCL", "FCL"]),
  paymentMethod: z.enum(["CARD", "BANK_TRANSFER", "WALLET", "CASH_ON_DELIVERY"]),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const shippingQuoteSchema = z.object({
  destinationCountry: z.enum(["NIGERIA", "GAMBIA"]),
  method: z.enum(["AIR_FREIGHT", "SEA_FREIGHT", "COURIER", "LCL", "FCL"]),
  weightGrams: z.coerce.number().min(1),
  lengthCm: z.coerce.number().min(0).optional(),
  widthCm: z.coerce.number().min(0).optional(),
  heightCm: z.coerce.number().min(0).optional(),
  cargoType: z.string().optional(),
});
export type ShippingQuoteInput = z.infer<typeof shippingQuoteSchema>;

export const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  description: z.string().min(10),
  categoryId: z.string().min(1),
  basePriceMinor: z.coerce.number().int().min(1),
  baseCurrency: z.enum(["CNY", "NGN", "GMD", "USD", "EUR", "GBP"]),
  moq: z.coerce.number().int().min(1).default(1),
  weightGrams: z.coerce.number().int().min(1).default(500),
  isWholesale: z.coerce.boolean().default(false),
  isFeatured: z.coerce.boolean().default(false),
  imageUrl: z.string().url().optional().or(z.literal("")),
  sourcePlatform: z
    .enum([
      "ATG",
      "MOCK_1688",
      "MOCK_TAOBAO",
      "ALIBABA",
      "SELLER",
      "AFFILIATE",
      "USA_STORE",
      "UK_STORE",
      "INTERNATIONAL_STORE",
      "CJDROPSHIPPING",
    ])
    .default("ATG"),
  affiliateUrl: z.string().url().optional().or(z.literal("")),
  affiliateProvider: z.string().optional().or(z.literal("")),
  // Shipping-engine fields (Phase 3). Optional here so existing products
  // can still be edited/saved without a forced dimensions backfill —
  // productCreateSchema below makes them mandatory for genuinely NEW
  // products, per "make weight and dimensions mandatory for products that
  // require shipping."
  shippingOriginId: z.string().optional().or(z.literal("")),
  packageLengthCm: z.coerce.number().int().min(1).optional(),
  packageWidthCm: z.coerce.number().int().min(1).optional(),
  packageHeightCm: z.coerce.number().int().min(1).optional(),
  shippingCategory: z.string().optional().or(z.literal("")),
  internationalShippingAllowed: z.coerce.boolean().default(true),
  customsRequired: z.coerce.boolean().default(false),
  isFragile: z.coerce.boolean().default(false),
  isHazardous: z.coerce.boolean().default(false),
});

// Stricter variant used only when creating a brand-new product: shipping
// origin and package dimensions become required, since every new product
// should be shippable-ready from day one — existing products (edited via
// the base productSchema above) are never retroactively forced to backfill.
export const productCreateSchema = productSchema.extend({
  shippingOriginId: z.string().min(1, "Select a shipping origin"),
  packageLengthCm: z.coerce.number().int().min(1, "Length is required"),
  packageWidthCm: z.coerce.number().int().min(1, "Width is required"),
  packageHeightCm: z.coerce.number().int().min(1, "Height is required"),
});
export type ProductInput = z.infer<typeof productSchema>;

export const productImageSchema = z.object({
  url: z.string().url(),
  altText: z.string().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
export type ProductImageInput = z.infer<typeof productImageSchema>;

export const productVariantSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional().or(z.literal("")),
  priceDeltaMinor: z.coerce.number().int().default(0),
  stock: z.coerce.number().int().min(0).default(999),
  attributes: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((val, ctx) => {
      if (!val) return {};
      try {
        return JSON.parse(val);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Attributes must be valid JSON, e.g. {\"color\":\"Black\"}" });
        return z.NEVER;
      }
    }),
});
export type ProductVariantInput = z.infer<typeof productVariantSchema>;

export const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const storeSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  country: z.enum(["CHINA", "USA", "UK"]),
  logoUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  internalBrowsePath: z.string().optional().or(z.literal("")),
  description: z.string().optional(),
  integrationType: z.enum(["API", "AFFILIATE", "DIRECT_LINK", "SHOP_FOR_ME", "FUTURE"]),
  affiliateUrl: z.string().url().optional().or(z.literal("")),
  apiStatus: z.string().optional(),
  isActive: z.coerce.boolean().default(true),
  shopForMeEnabled: z.coerce.boolean().default(true),
  supportedDestinations: z
    .array(z.enum(["NIGERIA", "GAMBIA"]))
    .default(["NIGERIA", "GAMBIA"]),
  sortOrder: z.coerce.number().int().default(0),
});
export type StoreInput = z.infer<typeof storeSchema>;

export const pricingPolicySchema = z.object({
  originCountry: z.enum(["CHINA", "USA", "UK"]),
  currency: z.enum(["CNY", "USD", "GBP", "NGN", "GMD", "EUR"]),
  domesticShippingMinor: z.coerce.number().int().min(0),
  serviceFeePercent: z.coerce.number().int().min(0).max(100),
  serviceFeeMinMinor: z.coerce.number().int().min(0),
  warehouseHandlingFeeMinor: z.coerce.number().int().min(0),
});
export type PricingPolicyInput = z.infer<typeof pricingPolicySchema>;

export const shippingRateSchema = z.object({
  originCountry: z.string().min(1).default("China"),
  destinationCountry: z.enum(["NIGERIA", "GAMBIA"]),
  method: z.enum(["AIR_FREIGHT", "SEA_FREIGHT", "COURIER", "LCL", "FCL"]),
  pricePerKgMinor: z.coerce.number().int().min(0),
  currency: z.enum(["USD", "NGN", "GMD"]),
  minChargeableWeightGrams: z.coerce.number().int().min(0).default(1000),
  estimatedDaysMin: z.coerce.number().int().min(0),
  estimatedDaysMax: z.coerce.number().int().min(0),
  notes: z.string().optional(),
});
export type ShippingRateInput = z.infer<typeof shippingRateSchema>;

export const warehouseReceiveSchema = z.object({
  orderId: z.string().optional(),
  userId: z.string().min(1),
  supplierName: z.string().optional(),
  weightGrams: z.coerce.number().int().min(1),
  lengthCm: z.coerce.number().int().min(0).optional(),
  widthCm: z.coerce.number().int().min(0).optional(),
  heightCm: z.coerce.number().int().min(0).optional(),
  trackingNumberIn: z.string().optional(),
  notes: z.string().optional(),
  destination: z.enum(["NIGERIA", "GAMBIA"]),
});
export type WarehouseReceiveInput = z.infer<typeof warehouseReceiveSchema>;

export const walletDepositSchema = z.object({
  amountMinor: z.coerce.number().int().min(100, "Minimum deposit is 1.00"),
  method: z.enum(["CARD", "BANK_TRANSFER"]),
});
export type WalletDepositInput = z.infer<typeof walletDepositSchema>;

export const deliveryZoneSchema = z.object({
  country: z.enum(["NIGERIA", "GAMBIA"]),
  city: z.string().min(2, "Enter a city name"),
  currency: z.enum(["NGN", "GMD"]),
  localFeeMinor: z.coerce.number().int().min(0).default(0),
  etaDaysMin: z.coerce.number().int().min(0),
  etaDaysMax: z.coerce.number().int().min(0),
});

// ---------------------------------------------------------------------------
// Shipping Calculation Engine — reference-data admin forms (Phase 6)
// ---------------------------------------------------------------------------

export const shippingOriginSchema = z.object({
  name: z.string().min(2, "Enter a name"),
  countryIso: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, "Use a 2-letter ISO country code, e.g. CN"),
  city: z.string().optional(),
});
export type ShippingOriginInput = z.infer<typeof shippingOriginSchema>;

export const destinationCountrySchema = z.object({
  name: z.string().min(2, "Enter a name"),
  isoCode: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, "Use a 2-letter ISO country code, e.g. GM"),
  region: z.string().optional(),
});
export type DestinationCountryInput = z.infer<typeof destinationCountrySchema>;

export const carrierSchema = z.object({
  name: z.string().min(2, "Enter a name"),
  code: z.string().trim().toUpperCase().min(2, "Enter a short code, e.g. DHL"),
  isLiveApiEnabled: z.coerce.boolean().default(false),
});
export type CarrierInput = z.infer<typeof carrierSchema>;

export const shippingServiceLevelSchema = z.object({
  name: z.string().min(2, "Enter a name"),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
export type ShippingServiceLevelInput = z.infer<typeof shippingServiceLevelSchema>;

export const shippingGlobalSettingsSchema = z.object({
  volumetricDivisor: z.coerce.number().int().min(1, "Must be greater than 0"),
  markupEnabled: z.coerce.boolean().default(false),
  defaultMarkupPercent: z.coerce.number().int().min(0),
  defaultMarkupFixedMinor: z.coerce.number().int().min(0),
  defaultHandlingFeeMinor: z.coerce.number().int().min(0),
});
export type ShippingGlobalSettingsInput = z.infer<typeof shippingGlobalSettingsSchema>;

export const customsSettingSchema = z.object({
  destinationCountryId: z.string().min(1),
  estimatedDutyPercent: z.coerce.number().int().min(0).optional(),
  importTaxPercent: z.coerce.number().int().min(0).optional(),
  customsProcessingFeeMinor: z.coerce.number().int().min(0).optional(),
  currency: z.string().trim().toUpperCase().optional(),
  notes: z.string().optional(),
  isConfigured: z.coerce.boolean().default(false),
});
export type CustomsSettingInput = z.infer<typeof customsSettingSchema>;

export const currencyRateSchema = z.object({
  fromCurrency: z.string().trim().toUpperCase().length(3, "Use a 3-letter ISO currency code, e.g. USD"),
  toCurrency: z.string().trim().toUpperCase().length(3, "Use a 3-letter ISO currency code, e.g. NGN"),
  rate: z.coerce.number().positive("Rate must be greater than 0"),
});
export type CurrencyRateInput = z.infer<typeof currencyRateSchema>;

// ---------------------------------------------------------------------------
// Shipping Calculation Engine — rate cards + brackets (Phase 7)
// ---------------------------------------------------------------------------

const markupOverrideSchema = z.enum(["INHERIT", "ENABLED", "DISABLED"]).default("INHERIT");

export const shippingRateCardSchema = z.object({
  shippingOriginId: z.string().min(1, "Select an origin"),
  destinationCountryId: z.string().min(1, "Select a destination"),
  destinationRegion: z.string().optional(),
  serviceLevelId: z.string().min(1, "Select a service level"),
  carrierId: z.string().min(1, "Select a carrier"),
  currency: z.string().trim().toUpperCase().length(3, "Use a 3-letter ISO currency code, e.g. USD"),
  deliveryDaysMin: z.coerce.number().int().min(0),
  deliveryDaysMax: z.coerce.number().int().min(0),
  trackingAvailable: z.coerce.boolean().default(true),
  markupOverride: markupOverrideSchema,
  markupPercent: z.coerce.number().int().min(0).optional(),
  markupFixedMinor: z.coerce.number().int().min(0).optional(),
  handlingFeeMinor: z.coerce.number().int().min(0).optional(),
  notes: z.string().optional(),
});
export type ShippingRateCardInput = z.infer<typeof shippingRateCardSchema>;

export const shippingRateBracketSchema = z.object({
  minGrams: z.coerce.number().int().min(0),
  maxGrams: z.coerce.number().int().min(1).optional(),
  basePriceMinor: z.coerce.number().int().min(0).default(0),
  pricePerKgMinor: z.coerce.number().int().min(0).default(0),
  minChargeMinor: z.coerce.number().int().min(0).default(0),
});
export type ShippingRateBracketInput = z.infer<typeof shippingRateBracketSchema>;
export type DeliveryZoneInput = z.infer<typeof deliveryZoneSchema>;
