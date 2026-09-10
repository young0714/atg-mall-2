import "server-only";
import { cookies } from "next/headers";
import { DESTINATION_COOKIE, DESTINATIONS, type Destination } from "@/lib/constants";

export { DESTINATION_COOKIE, DESTINATIONS };
export type { Destination };

/** Reads the visitor's selected shopping destination from a cookie, defaulting to Nigeria. */
export function getDestination(): Destination {
  const value = cookies().get(DESTINATION_COOKIE)?.value;
  if (value === "GAMBIA") return DESTINATIONS.GAMBIA;
  return DESTINATIONS.NIGERIA;
}
