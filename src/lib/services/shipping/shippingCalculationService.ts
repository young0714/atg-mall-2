import "server-only";
import { db } from "@/lib/db";
import type { Currency } from "@prisma/client";
import { manualRateProvider } from "./manualRateProvider";
import { createUnconfiguredLiveCarrierProvider } from "./liveCarrierProvider";
import { dhlRateProvider } from "./dhlRateProvider";
import { currencyRateService } from "./currencyRateService";
import type { RateProvider } from "./rateProvider";
import type { PackageDetails, ShippingRateOption, ShippingRateQuoteResult, ShippingRateRequest } from "./types";

/**
 * Orchestrates rate providers for one origin -> destination lane: tries
 * configured live carrier APIs first, falls back to the admin-configured
 * manual rate cards on failure or absence, converts every amount into the
 * caller's display currency, and never returns a fabricated $0 — an empty
 * `options` array + `unavailableReason` means "show a clear message",
 * per the spec.
 */

export interface ConvertedShippingOption extends ShippingRateOption {
  displayCurrency: Currency;
  displayCarrierCostMinor: number;
  displayMarkupMinor: number;
  displayHandlingFeeMinor: number;
  displayCustomerPriceMinor: number;
  isExchangeRateStale: boolean;
}

export interface ShippingLaneQuote {
  originIso: string;
  destinationIso: string;
  options: ConvertedShippingOption[];
  unavailableReason?: string;
}

// Live carrier providers, tried in order before falling back to manual rate
// cards. DHL is real but stays off until its API credentials are set and the
// DHL carrier is switched on in admin (see dhlRateProvider.ts); FedEx is
// still a placeholder. A provider listed here feeds checkout automatically
// once it reports isConfigured().
const LIVE_PROVIDERS: RateProvider[] = [
  dhlRateProvider,
  createUnconfiguredLiveCarrierProvider("FEDEX"),
];

export interface ShippingCalculationService {
  getLaneQuote(params: {
    originIso: string;
    destinationIso: string;
    destinationRegion?: string | null;
    package: PackageDetails;
    displayCurrency: Currency;
  }): Promise<ShippingLaneQuote>;
}

// Exported (not just the default singleton below) so tests can inject a
// fake/failing provider list to exercise the live-API-failure fallback path
// without needing a real, currently-nonexistent carrier integration.
export class DefaultShippingCalculationService implements ShippingCalculationService {
  constructor(private readonly liveProviders: RateProvider[] = LIVE_PROVIDERS) {}

  async getLaneQuote({
    originIso,
    destinationIso,
    destinationRegion,
    package: pkg,
    displayCurrency,
  }: {
    originIso: string;
    destinationIso: string;
    destinationRegion?: string | null;
    package: PackageDetails;
    displayCurrency: Currency;
  }): Promise<ShippingLaneQuote> {
    const request: ShippingRateRequest = { originIso, destinationIso, destinationRegion, package: pkg };

    let liveApiFailed = false;
    for (const provider of this.liveProviders) {
      if (!provider.isConfigured()) continue;
      try {
        const result = await provider.getRates(request);
        if (result.options.length > 0) {
          // `await` so a conversion failure is caught below and falls back to manual rates.
          return await this.toDisplayQuote(result, displayCurrency);
        }
      } catch (err) {
        liveApiFailed = true;
        await this.logApiError(provider.name, originIso, destinationIso, err);
      }
    }

    const manualResult = await manualRateProvider.getRates(request);
    if (liveApiFailed) {
      manualResult.options = manualResult.options.map((o) => ({ ...o, rateSource: "FALLBACK" as const }));
    }
    return this.toDisplayQuote(manualResult, displayCurrency);
  }

  private async toDisplayQuote(
    result: ShippingRateQuoteResult,
    displayCurrency: Currency,
  ): Promise<ShippingLaneQuote> {
    const options: ConvertedShippingOption[] = [];
    for (const option of result.options) {
      const [cost, markup, handling, total] = await Promise.all([
        currencyRateService.convert(option.carrierCostMinor, option.currency, displayCurrency),
        currencyRateService.convert(option.markupMinor, option.currency, displayCurrency),
        currencyRateService.convert(option.handlingFeeMinor, option.currency, displayCurrency),
        currencyRateService.convert(option.customerPriceMinor, option.currency, displayCurrency),
      ]);
      options.push({
        ...option,
        displayCurrency,
        displayCarrierCostMinor: cost.amountMinor,
        displayMarkupMinor: markup.amountMinor,
        displayHandlingFeeMinor: handling.amountMinor,
        displayCustomerPriceMinor: total.amountMinor,
        isExchangeRateStale: cost.isStale || markup.isStale || handling.isStale || total.isStale,
      });
    }
    return {
      originIso: result.originIso,
      destinationIso: result.destinationIso,
      options,
      unavailableReason: result.unavailableReason,
    };
  }

  private async logApiError(providerName: string, originIso: string, destinationIso: string, err: unknown) {
    try {
      await db.auditLog.create({
        data: {
          action: "SHIPPING_API_ERROR",
          entityType: "RateProvider",
          entityId: providerName,
          summary: `${providerName} live rate lookup failed for ${originIso} -> ${destinationIso}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
      });
    } catch {
      // Never let audit logging itself break a shipping quote.
    }
  }
}

export const shippingCalculationService: ShippingCalculationService = new DefaultShippingCalculationService();
