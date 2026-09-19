import "server-only";

/**
 * DHL Shipment Tracking - Unified API client. Used only as a fallback by
 * trackingService.ts when ATG's own manually-entered TrackingEvents have
 * gone stale — never the primary source, never written back to the DB.
 *
 * Auth is a single `DHL-API-Key` header (no OAuth, no secret) per DHL's own
 * spec. Base URL differs by environment (sandbox vs production use
 * different hosts, not just different keys) — defaults to the sandbox host;
 * set DHL_API_BASE_URL to switch to production once ready.
 */

const SANDBOX_BASE_URL = "https://api-sandbox.dhl.com/track";

export function isDhlTrackingConfigured(): boolean {
  return !!process.env.DHL_API_KEY;
}

interface DhlAddress {
  countryCode?: string;
  postalCode?: string;
  addressLocality?: string;
}

interface DhlEvent {
  timestamp: string;
  location?: { address?: DhlAddress };
  statusCode: string;
  status: string;
}

interface DhlTrackResponse {
  shipments?: {
    id: string;
    status: DhlEvent;
    events?: DhlEvent[];
  }[];
}

export interface DhlTrackingResult {
  status: string;
  currentLocation: string | null;
  timeline: { status: string; location: string | null; description: string; occurredAt: Date }[];
}

function formatLocation(address?: DhlAddress): string | null {
  if (!address) return null;
  return [address.addressLocality, address.countryCode].filter(Boolean).join(", ") || null;
}

/** Never throws — any failure (network, 404, bad key, malformed response) just returns null so the caller keeps whatever manual data it already has. */
export async function getDhlTracking(trackingNumber: string): Promise<DhlTrackingResult | null> {
  const apiKey = process.env.DHL_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.DHL_API_BASE_URL || SANDBOX_BASE_URL;

  try {
    const res = await fetch(`${baseUrl}/shipments?trackingNumber=${encodeURIComponent(trackingNumber)}`, {
      headers: { "DHL-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data: DhlTrackResponse = await res.json();
    const shipment = data.shipments?.[0];
    if (!shipment) return null;

    return {
      status: shipment.status.status,
      currentLocation: formatLocation(shipment.status.location?.address),
      timeline: (shipment.events ?? []).map((e) => ({
        status: e.status,
        location: formatLocation(e.location?.address),
        description: e.status,
        occurredAt: new Date(e.timestamp),
      })),
    };
  } catch {
    return null;
  }
}
