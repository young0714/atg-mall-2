import "server-only";

/**
 * Shared OAuth client-credentials helper for every Reloadly product API —
 * each product (Airtime, Gift Cards, Utility Payments) has its own audience
 * and its own token, but the auth flow itself is identical, so this is the
 * one place it's implemented.
 */

const AUTH_URL = "https://auth.reloadly.com/oauth/token";

// Tokens last 24h (sandbox) / 60 days (production) per Reloadly's own docs —
// caching per audience avoids re-authenticating on every request within a
// warm serverless instance. Module-level, so it only helps within one
// instance's lifetime, which is still a meaningful reduction in practice.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getReloadlyAccessToken(audience: string, clientId: string, clientSecret: string): Promise<string> {
  const cached = tokenCache.get(audience);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      audience,
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) {
    throw new Error(body?.message || "Could not authenticate with Reloadly.");
  }

  const expiresAt = Date.now() + (typeof body.expires_in === "number" ? body.expires_in : 3600) * 1000;
  tokenCache.set(audience, { token: body.access_token, expiresAt });
  return body.access_token;
}
