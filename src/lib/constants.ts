// Client-safe display constants (label maps, copy). Deliberately has no
// "server-only" dependency so both server and client components can import
// it — unlike the service layer under src/lib/services, which talks to the
// database and must stay server-side.
import type { ShippingMethod, Currency, Role } from "@prisma/client";

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  AIR_FREIGHT: "Air Freight",
  SEA_FREIGHT: "Sea Freight",
  COURIER: "Express Courier",
  LCL: "Sea Freight (LCL)",
  FCL: "Sea Freight (FCL)",
};

export const SHIPPING_METHOD_DESCRIPTIONS: Record<ShippingMethod, string> = {
  AIR_FREIGHT: "Fastest international option. Best for lighter, higher-value or urgent parcels.",
  SEA_FREIGHT: "Most economical for heavy or bulky cargo. Longer transit time.",
  COURIER: "Door-to-door express service via international courier, for small urgent parcels.",
  LCL: "Less-than-container-load sea freight — shared container, priced per cubic meter/kg.",
  FCL: "Full-container-load sea freight — for large wholesale/bulk shipments.",
};

export const DESTINATION_COOKIE = "atg_destination";

// The default destination for a visitor with no cookie yet — United States
// resolves to USD via currencyForDestinationIso, the same bucket every
// country except Nigeria/Gambia already falls into.
export const DEFAULT_DESTINATION_ISO = "US";

export interface Destination {
  isoCode: string;
  name: string;
  currency: Currency;
}

// Renders any 2-letter ISO-3166 country code as its flag emoji (a formula,
// not a lookup table) — works for any country an admin adds to
// DestinationCountry without needing a matching flag map entry.
export function isoToFlagEmoji(isoCode: string): string {
  return isoCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  OPERATIONS_ADMIN: "Operations Admin",
  SOURCING_STAFF: "Sourcing Staff",
  WAREHOUSE_STAFF: "Warehouse Staff",
  SHIPPING_STAFF: "Shipping Staff",
  FINANCE_STAFF: "Finance Staff",
  CUSTOMER_SUPPORT: "Customer Support",
  SELLER: "Seller",
  CUSTOMER: "Customer",
};

export const ORDER_STATUS_FLOW = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "PURCHASED",
  "SUPPLIER_SHIPPED",
  "RECEIVED_AT_WAREHOUSE",
  "READY_FOR_SHIPPING",
  "SHIPPED",
  "IN_TRANSIT",
  "CUSTOMS",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export const PACKAGE_STATUS_FLOW = [
  "ORDERED",
  "IN_TRANSIT_TO_WAREHOUSE",
  "RECEIVED",
  "INSPECTION",
  "AWAITING_CUSTOMER_INSTRUCTION",
  "CONSOLIDATION",
  "READY_TO_SHIP",
  "SHIPPED",
  "IN_TRANSIT",
  "CUSTOMS",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export const SHIPMENT_STATUS_FLOW = [
  "READY_TO_SHIP",
  "SHIPPED",
  "IN_TRANSIT",
  "CUSTOMS",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export const APP_NAME = "ATG Mall";
export const PARENT_COMPANY = "Apex Terra Global Limited";
export const SUPPORT_EMAIL = "support@apexterraglobal.com";
export const SUPPORT_PHONE = "+234 704 394 5345";

// A representative slice for the Digital Services country picker, not the
// full 170+ countries Reloadly actually covers — the picker's search still
// works against whatever's here; reloadlyService.getOperators() is the real
// source of truth for whether a given country has operators available.
//
// `currency` is set ONLY for countries whose local currency is one of ATG's
// own 6 Currency enum values — confirmed via a live sandbox call that
// Reloadly's operator pricing is always in the destination's own local
// currency with no currency-code field and no USD-equivalent fallback in
// the response, so a country without a matching Currency here has real
// operators/prices but no correct way to convert them into a wallet charge.
// AirtimeFlow shows "not available yet" for those rather than guessing.
// The only currencies ATG can correctly charge a wallet in — any Reloadly
// pricing (airtime local-currency, or a gift card's own currencyCode) that
// isn't one of these can't be converted into a wallet charge.
export const SUPPORTED_WALLET_CURRENCIES: Currency[] = ["NGN", "GMD", "USD", "EUR", "GBP", "CNY"];

export interface AirtimeCountry {
  isoCode: string;
  name: string;
  flag: string;
  currency?: Currency;
}
export const AIRTIME_COUNTRIES: AirtimeCountry[] = [
  { isoCode: "NG", name: "Nigeria", flag: "🇳🇬", currency: "NGN" },
  { isoCode: "GM", name: "Gambia", flag: "🇬🇲", currency: "GMD" },
  { isoCode: "GH", name: "Ghana", flag: "🇬🇭" },
  { isoCode: "KE", name: "Kenya", flag: "🇰🇪" },
  { isoCode: "ZA", name: "South Africa", flag: "🇿🇦" },
  { isoCode: "SN", name: "Senegal", flag: "🇸🇳" },
  { isoCode: "CI", name: "Ivory Coast", flag: "🇨🇮" },
  { isoCode: "CM", name: "Cameroon", flag: "🇨🇲" },
  { isoCode: "EG", name: "Egypt", flag: "🇪🇬" },
  { isoCode: "MA", name: "Morocco", flag: "🇲🇦" },
  { isoCode: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP" },
  { isoCode: "US", name: "United States", flag: "🇺🇸", currency: "USD" },
  { isoCode: "CA", name: "Canada", flag: "🇨🇦" },
  { isoCode: "IN", name: "India", flag: "🇮🇳" },
  { isoCode: "PK", name: "Pakistan", flag: "🇵🇰" },
  { isoCode: "PH", name: "Philippines", flag: "🇵🇭" },
  { isoCode: "ID", name: "Indonesia", flag: "🇮🇩" },
  { isoCode: "FR", name: "France", flag: "🇫🇷", currency: "EUR" },
  { isoCode: "DE", name: "Germany", flag: "🇩🇪", currency: "EUR" },
  { isoCode: "ES", name: "Spain", flag: "🇪🇸", currency: "EUR" },
  { isoCode: "IT", name: "Italy", flag: "🇮🇹", currency: "EUR" },
  { isoCode: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { isoCode: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { isoCode: "CN", name: "China", flag: "🇨🇳", currency: "CNY" },
  { isoCode: "BR", name: "Brazil", flag: "🇧🇷" },
  { isoCode: "MX", name: "Mexico", flag: "🇲🇽" },
  { isoCode: "JM", name: "Jamaica", flag: "🇯🇲" },
  { isoCode: "AU", name: "Australia", flag: "🇦🇺" },
];
export const CORPORATE_SITE = "https://apexterraglobal.com";
