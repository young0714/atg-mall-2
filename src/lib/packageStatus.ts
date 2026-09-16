import type { PackageStatus } from "@prisma/client";

// Shared between the account overview's tile counts and the packages list's
// filter, so the two can never drift out of sync with each other.
export const WAREHOUSE_STATUSES: PackageStatus[] = [
  "RECEIVED",
  "INSPECTION",
  "AWAITING_CUSTOMER_INSTRUCTION",
  "CONSOLIDATION",
  "READY_TO_SHIP",
];

export const ACTIVE_SHIPMENT_STATUSES: PackageStatus[] = ["SHIPPED", "IN_TRANSIT", "CUSTOMS", "OUT_FOR_DELIVERY"];
