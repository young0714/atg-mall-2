import "server-only";
import { db } from "@/lib/db";
import { callAliExpressApi, aliexpressIsConfigured } from "./aliexpressClient";

/**
 * ATG Mall's own OAuth session with AliExpress — a single, business-level
 * connection (not per-customer), stored as the one row of
 * AliExpressAuthToken. An admin creates it once via the "Connect
 * AliExpress" button (redirect → approve → callback), and this service
 * refreshes it automatically from then on.
 */

const AUTH_BASE_URL = "https://api-sg.aliexpress.com/oauth/authorize";
const TOKEN_REFRESH_SAFETY_MARGIN_MS = 5 * 60 * 1000;

interface AliExpressTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  refresh_expires_in: number; // seconds
}

export function aliexpressAuthIsConfigured(): boolean {
  return aliexpressIsConfigured() && !!process.env.ALIEXPRESS_CALLBACK_URL;
}

export function getAliExpressAuthorizationUrl(): string {
  if (!aliexpressAuthIsConfigured()) {
    throw new Error("AliExpress is not configured — set ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET, ALIEXPRESS_CALLBACK_URL.");
  }
  const params = new URLSearchParams({
    response_type: "code",
    force_auth: "true",
    client_id: process.env.ALIEXPRESS_APP_KEY!,
    redirect_uri: process.env.ALIEXPRESS_CALLBACK_URL!,
  });
  return `${AUTH_BASE_URL}?${params.toString()}`;
}

async function saveToken(data: AliExpressTokenResponse) {
  const now = Date.now();
  const existing = await db.aliExpressAuthToken.findFirst();
  const fields = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpiresAt: new Date(now + data.expires_in * 1000),
    refreshTokenExpiresAt: new Date(now + data.refresh_expires_in * 1000),
  };
  if (existing) {
    await db.aliExpressAuthToken.update({ where: { id: existing.id }, data: fields });
  } else {
    await db.aliExpressAuthToken.create({ data: fields });
  }
}

/** Exchanges an authorization code (from the OAuth callback) for tokens and stores them. */
export async function exchangeAliExpressCode(code: string): Promise<void> {
  const data = await callAliExpressApi<AliExpressTokenResponse>("/auth/token/create", { code });
  await saveToken(data);
}

async function refreshAliExpressToken(refreshToken: string): Promise<void> {
  const data = await callAliExpressApi<AliExpressTokenResponse>("/auth/token/refresh", { refresh_token: refreshToken });
  await saveToken(data);
}

export async function isAliExpressConnected(): Promise<boolean> {
  const token = await db.aliExpressAuthToken.findFirst();
  return !!token;
}

/** Returns a currently-valid access token, refreshing first if it's about to expire. Throws if never connected. */
export async function getValidAliExpressAccessToken(): Promise<string> {
  const token = await db.aliExpressAuthToken.findFirst();
  if (!token) {
    throw new Error("AliExpress isn't connected yet — an admin needs to connect it first.");
  }

  if (token.accessTokenExpiresAt.getTime() - TOKEN_REFRESH_SAFETY_MARGIN_MS > Date.now()) {
    return token.accessToken;
  }

  if (token.refreshTokenExpiresAt.getTime() <= Date.now()) {
    throw new Error("AliExpress's connection has expired — an admin needs to reconnect it.");
  }

  await refreshAliExpressToken(token.refreshToken);
  const refreshed = await db.aliExpressAuthToken.findFirst();
  return refreshed!.accessToken;
}
