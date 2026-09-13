import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { DESTINATION_COOKIE, type Destination } from "@/lib/constants";
import { currencyForDestinationIso } from "@/lib/services/destinationCountryService";

export { DESTINATION_COOKIE };
export type { Destination };

/** Reads the visitor's selected shopping destination from a cookie, defaulting to Nigeria. */
export async function getDestination(): Promise<Destination> {
  const iso = cookies().get(DESTINATION_COOKIE)?.value;
  const found = iso
    ? await db.destinationCountry.findFirst({ where: { isoCode: iso.toUpperCase(), isActive: true } })
    : null;
  const resolved = found ?? (await db.destinationCountry.findFirst({ where: { isoCode: "NG", isActive: true } }));
  return {
    isoCode: resolved!.isoCode,
    name: resolved!.name,
    currency: currencyForDestinationIso(resolved!.isoCode),
  };
}
