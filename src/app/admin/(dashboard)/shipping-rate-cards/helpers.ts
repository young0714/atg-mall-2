import { db } from "@/lib/db";
import type { ShippingRateCardInput } from "@/lib/validation/schemas";
import type { Prisma } from "@prisma/client";

// The DB unique constraint on (origin, destination, region, serviceLevel)
// does NOT catch two rows that both have a NULL region — Postgres treats
// each NULL as distinct — so duplicate prevention for "all regions" cards
// has to happen here at the application level.
export async function findDuplicateRateCard(
  data: Pick<ShippingRateCardInput, "shippingOriginId" | "destinationCountryId" | "destinationRegion" | "serviceLevelId">,
  excludeId?: string,
) {
  return db.shippingRateCard.findFirst({
    where: {
      shippingOriginId: data.shippingOriginId,
      destinationCountryId: data.destinationCountryId,
      destinationRegion: data.destinationRegion || null,
      serviceLevelId: data.serviceLevelId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

export function toCardWriteData(data: ShippingRateCardInput): Prisma.ShippingRateCardUncheckedCreateInput {
  return {
    shippingOriginId: data.shippingOriginId,
    destinationCountryId: data.destinationCountryId,
    destinationRegion: data.destinationRegion || null,
    serviceLevelId: data.serviceLevelId,
    carrierId: data.carrierId,
    currency: data.currency,
    deliveryDaysMin: data.deliveryDaysMin,
    deliveryDaysMax: data.deliveryDaysMax,
    trackingAvailable: data.trackingAvailable,
    markupEnabled: data.markupOverride === "INHERIT" ? null : data.markupOverride === "ENABLED",
    markupPercent: data.markupPercent ?? null,
    markupFixedMinor: data.markupFixedMinor ?? null,
    handlingFeeMinor: data.handlingFeeMinor ?? null,
    notes: data.notes || null,
  };
}
