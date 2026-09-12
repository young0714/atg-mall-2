import "server-only";
import { db } from "@/lib/db";
import type { Currency, SourcePlatform } from "@prisma/client";
import { shippingCalculationService, type ShippingLaneQuote } from "./shippingCalculationService";
import { sourcePlatformToStoreCountry, storeCountryToIsoCode } from "../storeOrigin";

/**
 * Groups a cart's line items by shipping origin and quotes each group
 * separately — the same logic used to DISPLAY the checkout shipment blocks
 * and to CHARGE the customer, so they can never drift apart. A cart with
 * USA + China products becomes two groups here, each independently quoted;
 * a group with no available quote is surfaced via `quote.unavailableReason`
 * rather than silently defaulting to $0 or being dropped.
 */

export interface CartLineForGrouping {
  productId: string;
  variantId: string | null;
  quantity: number;
  weightGrams: number;
  shippingOriginId: string | null;
  sourcePlatform: SourcePlatform;
}

export interface CartShipmentGroup {
  shippingOriginId: string;
  originName: string;
  originIso: string;
  lines: CartLineForGrouping[];
  totalWeightGrams: number;
  quote: ShippingLaneQuote;
}

export interface CartGroupingResult {
  groups: CartShipmentGroup[];
  // Lines that couldn't be resolved to ANY shipping origin at all (should
  // be effectively impossible given every seeded origin covers CN/US/GB,
  // but surfaced explicitly rather than silently dropped/ignored).
  unresolvedLines: CartLineForGrouping[];
}

export async function groupCartForShipping(
  lines: CartLineForGrouping[],
  destinationIso: string,
  displayCurrency: Currency,
): Promise<CartGroupingResult> {
  const origins = await db.shippingOrigin.findMany({ where: { isActive: true } });
  const originsById = new Map(origins.map((o) => [o.id, o]));
  const originsByIso = new Map(origins.map((o) => [o.countryIso, o]));

  const linesByOriginId = new Map<string, CartLineForGrouping[]>();
  const unresolvedLines: CartLineForGrouping[] = [];

  for (const line of lines) {
    let originId = line.shippingOriginId && originsById.has(line.shippingOriginId) ? line.shippingOriginId : null;
    if (!originId) {
      const fallbackIso = storeCountryToIsoCode(sourcePlatformToStoreCountry(line.sourcePlatform));
      originId = originsByIso.get(fallbackIso)?.id ?? null;
    }
    if (!originId) {
      unresolvedLines.push(line);
      continue;
    }
    const existing = linesByOriginId.get(originId) ?? [];
    existing.push(line);
    linesByOriginId.set(originId, existing);
  }

  const groups: CartShipmentGroup[] = [];
  for (const [originId, groupLines] of linesByOriginId) {
    const origin = originsById.get(originId)!;
    const totalWeightGrams = groupLines.reduce((sum, l) => sum + l.weightGrams * l.quantity, 0);

    let quote: ShippingLaneQuote;
    try {
      quote = await shippingCalculationService.getLaneQuote({
        originIso: origin.countryIso,
        destinationIso,
        package: { weightGrams: totalWeightGrams },
        displayCurrency,
      });
    } catch (err) {
      quote = {
        originIso: origin.countryIso,
        destinationIso,
        options: [],
        unavailableReason: err instanceof Error ? err.message : "Failed to compute a shipping quote for this shipment.",
      };
    }

    groups.push({
      shippingOriginId: originId,
      originName: origin.name,
      originIso: origin.countryIso,
      lines: groupLines,
      totalWeightGrams,
      quote,
    });
  }

  return { groups, unresolvedLines };
}
