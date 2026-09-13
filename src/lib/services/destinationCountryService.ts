import "server-only";
import { db } from "@/lib/db";
import type { Currency } from "@prisma/client";

/**
 * The single source of truth for "what countries can a customer be
 * associated with" across registration, addresses, checkout, and every
 * admin/staff form that used to be hardcoded to Nigeria/Gambia. Every
 * validity check and country->currency rule routes through here so they
 * can never drift between call sites.
 */

export async function isActiveDestinationIso(iso: string): Promise<boolean> {
  const normalized = iso.trim().toUpperCase();
  const found = await db.destinationCountry.findFirst({ where: { isoCode: normalized, isActive: true } });
  return !!found;
}

export async function getActiveDestinationCountries() {
  return db.destinationCountry.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function destinationCountryNameFor(iso: string): Promise<string> {
  const found = await db.destinationCountry.findFirst({ where: { isoCode: iso.trim().toUpperCase() } });
  return found?.name ?? iso;
}

// The one confirmed currency rule: Nigeria stays NGN, Gambia stays GMD,
// every other country defaults to USD. There's no real local payment
// gateway behind any currency today (Card/Bank Transfer are both mocked),
// so this is purely a currency-of-record choice, not a payment-rail one.
export function currencyForDestinationIso(iso: string): Currency {
  const normalized = iso.trim().toUpperCase();
  if (normalized === "NG") return "NGN";
  if (normalized === "GM") return "GMD";
  return "USD";
}
