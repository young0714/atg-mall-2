import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { signSessionToken, verifySessionToken, idleWindowSecondsFor, type SessionPayload } from "@/lib/auth/jwt";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "atg_session";

/**
 * Slides the session's expiry forward on every active request, so an
 * engaged user is never logged out mid-visit — a session only lapses after
 * genuine inactivity (see idleWindowSecondsFor in jwt.ts), not on a fixed
 * clock from login. An invalid/expired/missing cookie is left untouched
 * here; the existing requireUser()/requireStaff() redirects handle that.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.next();

  const session = await verifySessionToken(token);
  if (!session) return NextResponse.next();

  const maxAgeSeconds = idleWindowSecondsFor(session.role);
  // Re-sign from a clean payload rather than the verified claims object, so
  // no stray iat/exp from the old token can leak into the refreshed one.
  const freshPayload: SessionPayload = {
    userId: session.userId,
    role: session.role,
    fullName: session.fullName,
    email: session.email,
  };
  const freshToken = await signSessionToken(freshPayload, maxAgeSeconds);

  const response = NextResponse.next();
  response.cookies.set(COOKIE_NAME, freshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.webmanifest).*)"],
};
