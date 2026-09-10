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

export const pricingPolicySchema = z.object({
  serviceFeePercent: z.coerce.number().int().min(0).max(100),
  serviceFeeMinMinorCny: z.coerce.number().int().min(0),
  chinaDomesticShippingMinorCny: z.coerce.number().int().min(0),
});
export type PricingPolicyInput = z.infer<typeof pricingPolicySchema>;

export const shippingRateSchema = z.object({
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
export type DeliveryZoneInput = z.infer<typeof deliveryZoneSchema>;
