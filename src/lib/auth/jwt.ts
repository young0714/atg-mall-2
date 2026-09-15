import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { ADMIN_ROLES } from "@/lib/rbac";

/**
 * Pure JWT helpers with no next/headers dependency, so this module is safe
 * to import from both Node/RSC contexts (session.ts) and the Edge runtime
 * (middleware.ts). session.ts's own cookies()-based wrappers can't be
 * reused in middleware since next/headers' cookies() only works inside
 * Server Components/Actions/Route Handlers.
 */

export interface SessionPayload {
  userId: string;
  role: Role;
  fullName: string;
  email: string;
  [key: string]: unknown;
}

// Sliding idle windows — a session's expiry is renewed on every active
// request (see middleware.ts), so an engaged user never gets logged out
// mid-visit; a session only lapses after this many seconds of no visits.
// Staff/admin roles get a much shorter window since that access touches
// payments and customer PII.
export const CUSTOMER_IDLE_SECONDS = 60 * 60 * 24 * 14; // 14 days
export const ADMIN_IDLE_SECONDS = 60 * 60 * 24 * 1; // 24 hours

export function idleWindowSecondsFor(role: Role): number {
  return ADMIN_ROLES.includes(role) ? ADMIN_IDLE_SECONDS : CUSTOMER_IDLE_SECONDS;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Add it to .env (see .env.example) before starting the app.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload, maxAgeSeconds: number): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
