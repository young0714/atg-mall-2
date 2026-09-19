import "server-only";

/**
 * FedEx "Basic Integrated Visibility" (Track) API client. Used only as a
 * fallback by trackingService.ts when ATG's own manually-entered
 * TrackingEvents have gone stale — never the primary source, never written
 * back to the DB. Same shape and same reasoning as dhlTrackingService.ts.
 *
 * Unlike DHL, FedEx uses OAuth2 client_credentials: a short-lived bearer
 * token (POST /oauth/token, ~1hr expiry) is required before every actual
 * track call. No token caching here — this is a low-frequency fallback
 * path (at most once per stale-shipment page view), so fetching a fresh
 * token each call is simpler and safer than managing cache invalidation
 * across serverless invocations.
 */

const SANDBOX_BASE_URL = "https://apis-sandbox.fedex.com";

export function isFedexTrackingConfigured(): boolean {
  return !!process.env.FEDEX_API_KEY && !!process.env.FEDEX_SECRET_KEY;
}

interface FedexAddress {
  city?: string;
  stateOrProvinceCode?: string;
  countryCode?: string;
}

interface FedexScanEvent {
  date: string;
  eventDescription: string;
  scanLocation?: FedexAddress;
}

interface FedexTrackResult {
  latestStatusDetail?: { description?: string; scanLocation?: FedexAddress };
  scanEvents?: FedexScanEvent[];
  error?: { message?: string };
}

interface FedexTrackResponse {
  output?: {
    completeTrackResults?: { trackResults?: FedexTrackResult[] }[];
  };
}

export interface FedexTrackingResult {
  status: string;
  currentLocation: string | null;
  timeline: { status: string; location: string | null; description: string; occurredAt: Date }[];
}

function formatLocation(address?: FedexAddress): string | null {
  if (!address) return null;
  return [address.city, address.stateOrProvinceCode || address.countryCode].filter(Boolean).join(", ") || null;
}

async function getFedexAccessToken(baseUrl: string): Promise<string | null> {
  const clientId = process.env.FEDEX_API_KEY;
  const clientSecret = process.env.FEDEX_SECRET_KEY;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

/** Never throws — any failure (network, auth, malformed response) just returns null so the caller keeps whatever manual data it already has. */
export async function getFedexTracking(trackingNumber: string): Promise<FedexTrackingResult | null> {
  const baseUrl = process.env.FEDEX_API_BASE_URL || SANDBOX_BASE_URL;

  try {
    const token = await getFedexAccessToken(baseUrl);
    if (!token) return null;

    const res = await fetch(`${baseUrl}/track/v1/trackingnumbers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-locale": "en_US",
      },
      body: JSON.stringify({
        includeDetailedScans: true,
        trackingInfo: [{ trackingNumberInfo: { trackingNumber } }],
      }),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data: FedexTrackResponse = await res.json();
    const trackResult = data.output?.completeTrackResults?.[0]?.trackResults?.[0];
    if (!trackResult || trackResult.error) return null;

    return {
      status: trackResult.latestStatusDetail?.description ?? "Unknown",
      currentLocation: formatLocation(trackResult.latestStatusDetail?.scanLocation),
      timeline: (trackResult.scanEvents ?? []).map((e) => ({
        status: e.eventDescription,
        location: formatLocation(e.scanLocation),
        description: e.eventDescription,
        occurredAt: new Date(e.date),
      })),
    };
  } catch {
    return null;
  }
}
