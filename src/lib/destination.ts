import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { DESTINATION_COOKIE, DEFAULT_DESTINATION_ISO, type Destination } from "@/lib/constants";
import { currencyForDestinationIso } from "@/lib/services/destinationCountryService";

export { DESTINATION_COOKIE };
export type { Destination };

const DESTINATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Reads the visitor's selected shopping destination from a cookie, defaulting to USD. */
export async function getDestination(): Promise<Destination> {
  const iso = cookies().get(DESTINATION_COOKIE)?.value;
  const found = iso
    ? await db.destinationCountry.findFirst({ where: { isoCode: iso.toUpperCase(), isActive: true } })
    : null;
  const resolved =
    found ?? (await db.destinationCountry.findFirst({ where: { isoCode: DEFAULT_DESTINATION_ISO, isActive: true } }));
  return {
    isoCode: resolved!.isoCode,
    name: resolved!.name,
    currency: currencyForDestinationIso(resolved!.isoCode),
  };
}

/** Sets the shopping-destination cookie server-side, same options DestinationSwitcher uses client-side. */
export function setDestinationCookie(isoCode: string): void {
  cookies().set(DESTINATION_COOKIE, isoCode.toUpperCase(), {
    path: "/",
    maxAge: DESTINATION_COOKIE_MAX_AGE,
  });
}

/**
 * Re-syncs the shopping-destination cookie to an authenticated user's own
 * country, so logging in always shows their own currency immediately
 * rather than leaving whatever the anonymous default was. No-ops for staff
 * accounts, which have no CustomerProfile.
 */
export async function syncDestinationToProfile(userId: string): Promise<void> {
  const profile = await db.customerProfile.findUnique({ where: { userId } });
  if (profile) setDestinationCookie(profile.countryIso);
}
