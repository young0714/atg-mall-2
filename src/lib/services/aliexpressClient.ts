import "server-only";
import { createHmac } from "crypto";

/**
 * Low-level signed-request helper for AliExpress's Open Platform API
 * (the "TOP" protocol). Shared by aliexpressAuthService (token
 * create/refresh) and aliexpressService (product/category lookups).
 *
 * Protocol verified directly against the real, current API — not from
 * documentation, which describes an outdated MD5 scheme — by reading the
 * source of the actively-maintained `ae_sdk` SDK and confirming with a
 * live signed call (aliexpress.ds.category.get) that returned real data.
 * Sign method is HMAC-SHA256, uppercase hex. TOP-style methods (dotted,
 * e.g. "aliexpress.ds.product.get") post to /sync; OP-style methods
 * (contain "/", e.g. "/auth/token/create") post to /rest/<method>.
 */

const TOP_API_URL = "https://api-sg.aliexpress.com/sync";
const OP_API_URL = "https://api-sg.aliexpress.com/rest";

export interface AliExpressErrorResponse {
  error_response: { code?: string; msg?: string; request_id?: string; type?: string };
}

export class AliExpressApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AliExpressApiError";
  }
}

export function aliexpressIsConfigured(): boolean {
  return !!process.env.ALIEXPRESS_APP_KEY && !!process.env.ALIEXPRESS_APP_SECRET;
}

function requireConfigured() {
  if (!aliexpressIsConfigured()) {
    throw new Error(
      "AliExpress is not configured — set ALIEXPRESS_APP_KEY and ALIEXPRESS_APP_SECRET before using this integration.",
    );
  }
}

function sign(params: Record<string, unknown>, appSecret: string): string {
  const p = { ...params };
  let basestring = "";
  if (typeof p.method === "string" && p.method.includes("/")) {
    basestring = p.method;
    delete p.method;
  }
  basestring += Object.entries(p)
    .filter(([, v]) => v != null)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [k, v]) => acc + k + String(v), "");

  return createHmac("sha256", appSecret, { encoding: "utf-8" }).update(basestring).digest("hex").toUpperCase();
}

/**
 * Calls a raw AliExpress API method. `session` is the OAuth access token —
 * omit it for the handful of methods that don't require one (category
 * list, token create/refresh).
 */
export async function callAliExpressApi<T>(
  method: string,
  params: Record<string, string | number | boolean | undefined>,
  session?: string,
): Promise<T> {
  requireConfigured();
  const appKey = process.env.ALIEXPRESS_APP_KEY!;
  const appSecret = process.env.ALIEXPRESS_APP_SECRET!;

  const fullParams: Record<string, unknown> = {
    ...params,
    method,
    app_key: appKey,
    simplify: true,
    sign_method: "sha256",
    timestamp: Date.now(),
    ...(session ? { session } : {}),
  };
  fullParams.sign = sign(fullParams, appSecret);

  const isOp = method.includes("/");
  const baseUrl = isOp ? `${OP_API_URL}${method}` : TOP_API_URL;
  const queryParams = { ...fullParams };
  if (isOp) delete queryParams.method;

  const qs = Object.entries(queryParams)
    .filter(([, v]) => v != null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");

  const res = await fetch(`${baseUrl}?${qs}`, { method: "POST" });
  const json = await res.json();

  if (json?.error_response) {
    const err = (json as AliExpressErrorResponse).error_response;
    throw new AliExpressApiError(err.msg || "AliExpress API error", err.code);
  }

  return json as T;
}
