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
export const CORPORATE_SITE = "https://apexterraglobal.com";
