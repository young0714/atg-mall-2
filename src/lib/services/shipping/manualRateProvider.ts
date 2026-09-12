import "server-only";
import { db } from "@/lib/db";
import type { RateProvider } from "./rateProvider";
import type { ShippingRateRequest, ShippingRateQuoteResult, ShippingRateOption } from "./types";

/**
 * Reads admin-configured `ShippingRateCard` + `ShippingRateBracket` rows.
 * Always configured (there is no external dependency) — this is the
 * fallback every other provider ultimately falls back to.
 *
 * Chargeable weight = MAX(actual, volumetric), volumetric computed with the
 * admin-configurable divisor from `ShippingGlobalSettings` (cm3 / divisor =
 * kg), per the spec's explicit requirement — never hardcoded per-method like
 * the legacy `shippingService.ts`.
 */
class ManualRateProvider implements RateProvider {
  readonly name = "MANUAL";

  isConfigured(): boolean {
    return true;
  }

  async getRates(request: ShippingRateRequest): Promise<ShippingRateQuoteResult> {
    const { originIso, destinationIso, destinationRegion, package: pkg } = request;

    const [origin, destination, globalSettings] = await Promise.all([
      db.shippingOrigin.findFirst({ where: { countryIso: originIso, isActive: true } }),
      db.destinationCountry.findFirst({ where: { isoCode: destinationIso, isActive: true } }),
      db.shippingGlobalSettings.findFirst(),
    ]);

    if (!origin) {
      return {
        originIso,
        destinationIso,
        options: [],
        unavailableReason: `No active shipping origin configured for "${originIso}".`,
      };
    }
    if (!destination) {
      return {
        originIso,
        destinationIso,
        options: [],
        unavailableReason: `Shipping to "${destinationIso}" is not yet available.`,
      };
    }

    const volumetricDivisor = globalSettings?.volumetricDivisor ?? 5000;
    const globalMarkupEnabled = globalSettings?.markupEnabled ?? true;
    const globalMarkupPercent = globalSettings?.defaultMarkupPercent ?? 0;
    const globalMarkupFixedMinor = globalSettings?.defaultMarkupFixedMinor ?? 0;
    const globalHandlingFeeMinor = globalSettings?.defaultHandlingFeeMinor ?? 0;

    const actualWeightGrams = pkg.weightGrams;
    const volumetricWeightGrams =
      pkg.lengthCm && pkg.widthCm && pkg.heightCm
        ? Math.round(((pkg.lengthCm * pkg.widthCm * pkg.heightCm) / volumetricDivisor) * 1000)
        : 0;
    const chargeableWeightGrams = Math.max(actualWeightGrams, volumetricWeightGrams);

    // A region-specific card (destinationRegion matches exactly) takes
    // priority over a "all regions" card (destinationRegion is null) for the
    // same origin/destination/service level.
    const cards = await db.shippingRateCard.findMany({
      where: {
        shippingOriginId: origin.id,
        destinationCountryId: destination.id,
        isActive: true,
        ...(destinationRegion
          ? { OR: [{ destinationRegion }, { destinationRegion: null }] }
          : { destinationRegion: null }),
      },
      include: { serviceLevel: true, carrier: true, brackets: { orderBy: { minGrams: "asc" } } },
      orderBy: { serviceLevel: { sortOrder: "asc" } },
    });

    const bestByServiceLevel = new Map<string, (typeof cards)[number]>();
    for (const card of cards) {
      const existing = bestByServiceLevel.get(card.serviceLevelId);
      const cardIsRegionSpecific = card.destinationRegion !== null;
      if (!existing) {
        bestByServiceLevel.set(card.serviceLevelId, card);
      } else if (cardIsRegionSpecific && existing.destinationRegion === null) {
        bestByServiceLevel.set(card.serviceLevelId, card);
      }
    }

    const options: ShippingRateOption[] = [];
    for (const card of bestByServiceLevel.values()) {
      if (!card.serviceLevel.isActive || !card.carrier.isActive) continue;

      const bracket = card.brackets.find(
        (b) => chargeableWeightGrams >= b.minGrams && (b.maxGrams === null || chargeableWeightGrams <= b.maxGrams),
      );
      if (!bracket) continue; // no bracket covers this weight on this card — skip, don't fabricate

      const chargeableKg = chargeableWeightGrams / 1000;
      const rawCost = bracket.basePriceMinor + bracket.pricePerKgMinor * chargeableKg;
      const carrierCostMinor = Math.max(Math.round(rawCost), bracket.minChargeMinor);

      const markupEnabled = card.markupEnabled ?? globalMarkupEnabled;
      let markupMinor = 0;
      if (markupEnabled) {
        const markupPercent = card.markupPercent ?? globalMarkupPercent;
        const markupFixedMinor = card.markupFixedMinor ?? globalMarkupFixedMinor;
        markupMinor = Math.round((carrierCostMinor * markupPercent) / 100) + markupFixedMinor;
      }
      const handlingFeeMinor = card.handlingFeeMinor ?? globalHandlingFeeMinor;

      options.push({
        serviceLevelName: card.serviceLevel.name,
        serviceLevelSortOrder: card.serviceLevel.sortOrder,
        carrierName: card.carrier.name,
        carrierId: card.carrier.id,
        trackingAvailable: card.trackingAvailable,
        actualWeightGrams,
        volumetricWeightGrams,
        chargeableWeightGrams,
        carrierCostMinor,
        markupMinor,
        handlingFeeMinor,
        customerPriceMinor: carrierCostMinor + markupMinor + handlingFeeMinor,
        currency: card.currency,
        estimatedDeliveryDaysMin: card.deliveryDaysMin,
        estimatedDeliveryDaysMax: card.deliveryDaysMax,
        rateSource: "MANUAL",
      });
    }

    options.sort((a, b) => a.serviceLevelSortOrder - b.serviceLevelSortOrder);

    return {
      originIso,
      destinationIso,
      options,
      unavailableReason:
        options.length === 0
          ? `No shipping rate is configured for ${origin.name} → ${destination.name} at ${chargeableWeightGrams}g yet.`
          : undefined,
    };
  }
}

export const manualRateProvider: RateProvider = new ManualRateProvider();
