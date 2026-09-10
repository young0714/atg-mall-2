import "server-only";
import { db } from "@/lib/db";

/**
 * TrackingService — resolves an ATG tracking number (e.g. ATG-NG-2026000123)
 * to its shipment, packages, and event timeline.
 *
 * Today this reads ATG's own `Shipment`/`TrackingEvent` tables, which are
 * populated by warehouse/shipping staff via the admin console (see
 * warehouseService.ts). The interface is intentionally shaped so a future
 * integration with an external courier/freight-forwarder tracking API can
 * populate the same `TrackingEvent` rows (e.g. via a webhook or polling job)
 * without changing this service's callers.
 */
export interface TrackingResult {
  trackingNumber: string;
  status: string;
  method: string;
  destinationCountry: string;
  destinationCity: string | null;
  estimatedDeliveryAt: Date | null;
  currentLocation: string | null;
  timeline: {
    status: string;
    location: string | null;
    description: string;
    occurredAt: Date;
  }[];
  packages: {
    packageCode: string;
    status: string;
    weightGrams: number | null;
  }[];
}

export interface TrackingService {
  track(trackingNumber: string): Promise<TrackingResult | null>;
}

class DefaultTrackingService implements TrackingService {
  async track(trackingNumber: string): Promise<TrackingResult | null> {
    const shipment = await db.shipment.findUnique({
      where: { trackingNumber: trackingNumber.trim().toUpperCase() },
      include: {
        trackingEvents: { orderBy: { occurredAt: "desc" } },
        packages: { include: { package: true } },
      },
    });
    if (!shipment) return null;

    const latestEvent = shipment.trackingEvents[0];

    return {
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      method: shipment.method,
      destinationCountry: shipment.destinationCountry,
      destinationCity: shipment.destinationCity,
      estimatedDeliveryAt: shipment.estimatedDeliveryAt,
      currentLocation: latestEvent?.location ?? shipment.origin,
      timeline: shipment.trackingEvents.map((e) => ({
        status: e.status,
        location: e.location,
        description: e.description,
        occurredAt: e.occurredAt,
      })),
      packages: shipment.packages.map((sp) => ({
        packageCode: sp.package.packageCode,
        status: sp.package.status,
        weightGrams: sp.package.weightGrams,
      })),
    };
  }
}

export const trackingService: TrackingService = new DefaultTrackingService();

/** Generates an ATG-style tracking/order number, e.g. ATG-NG-2026000123 */
export function generateAtgNumber(prefix: "ATG" | "ATG-PKG" | "ATG-CONS", country: "NIGERIA" | "GAMBIA"): string {
  const countryCode = country === "NIGERIA" ? "NG" : "GM";
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${countryCode}-${year}${random}`;
}
