import "server-only";
import { cookies } from "next/headers";
import type { Country, Currency } from "@prisma/client";

export const DESTINATION_COOKIE = "atg_destination";

export interface Destination {
  country: Country;
  currency: Currency;
  label: string;
  flag: string;
}

export const DESTINATIONS: Record<Country, Destination> = {
  NIGERIA: { country: "NIGERIA", currency: "NGN", label: "Nigeria", flag: "🇳🇬" },
  GAMBIA: { country: "GAMBIA", currency: "GMD", label: "Gambia", flag: "🇬🇲" },
};

/** Reads the visitor's selected shopping destination from a cookie, defaulting to Nigeria. */
export function getDestination(): Destination {
  const value = cookies().get(DESTINATION_COOKIE)?.value;
  if (value === "GAMBIA") return DESTINATIONS.GAMBIA;
  return DESTINATIONS.NIGERIA;
}
