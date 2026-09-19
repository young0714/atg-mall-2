import "server-only";
import { db } from "@/lib/db";
import { getDhlTracking } from "./dhlTrackingService";

/**
 * TrackingService — resolves an ATG tracking number (e.g. ATG-NG-2026000123)
 * to its shipment, packages, and event timeline.
 *
 * Primarily reads ATG's own `Shipment`/`TrackingEvent` tables, populated by
 * warehouse/shipping staff via the admin console (see warehouseService.ts).
 * Manual entries are always the system of record — nothing here writes
 * courier data back to the DB. When a shipment is linked to a live-API
 * carrier (Shipment.carrier, e.g. DHL) and its manual entries have gone
 * stale (see STALE_AFTER_MS below), this falls back to a live courier
 * lookup for just that one request's response, so a customer never sees a
 * "no updates yet" page just because staff haven't logged anything recently.
 */

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
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
        carrier: true,
      },
    });
    if (!shipment) return null;

    const latestEvent = shipment.trackingEvents[0];
    const isStale = !latestEvent || Date.now() - latestEvent.occurredAt.getTime() > STALE_AFTER_MS;

    let liveStatus = shipment.status as string;
    let liveLocation: string | null = latestEvent?.location ?? shipment.origin;
    let liveTimeline = shipment.trackingEvents.map((e) => ({
      status: e.status,
      location: e.location,
      description: e.description,
      occurredAt: e.occurredAt,
    }));

    if (
      isStale &&
      shipment.status !== "DELIVERED" &&
      shipment.carrier?.code === "DHL" &&
      shipment.carrier.isLiveApiEnabled &&
      shipment.carrierTrackingNumber
    ) {
      const dhl = await getDhlTracking(shipment.carrierTrackingNumber);
      if (dhl) {
        liveStatus = dhl.status;
        liveLocation = dhl.currentLocation ?? liveLocation;
        liveTimeline = dhl.timeline;
      }
    }

    return {
      trackingNumber: shipment.trackingNumber,
      status: liveStatus,
      method: shipment.method,
      destinationCountry: shipment.destinationCountryIso,
      destinationCity: shipment.destinationCity,
      estimatedDeliveryAt: shipment.estimatedDeliveryAt,
      currentLocation: liveLocation,
      timeline: liveTimeline,
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
export function generateAtgNumber(prefix: "ATG" | "ATG-PKG" | "ATG-CONS", destinationIso: string): string {
  const countryCode = destinationIso.trim().toUpperCase();
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${countryCode}-${year}${random}`;
}
