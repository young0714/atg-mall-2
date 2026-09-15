import "server-only";
import { cookies } from "next/headers";
import { signSessionToken, verifySessionToken, idleWindowSecondsFor, type SessionPayload } from "./jwt";

// Session cookie is a signed JWT (HS256), httpOnly + secure + SameSite=Lax.
// We deliberately avoid a server-side session table for Phase 1 — the JWT
// carries only non-sensitive identity claims and is short-lived + renewable.
//
// Expiry is a sliding idle window, not a fixed clock from login — see
// idleWindowSecondsFor() in jwt.ts. middleware.ts renews the cookie on
// every active request; this file only sets the *initial* expiry at login.

export type { SessionPayload };

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "atg_session";

export async function createSession(payload: SessionPayload): Promise<string> {
  const maxAgeSeconds = idleWindowSecondsFor(payload.role);
  const token = await signSessionToken(payload, maxAgeSeconds);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function destroySession(): void {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
