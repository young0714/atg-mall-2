import type { RateProvider } from "./rateProvider";
import type { ShippingRateQuoteResult, ShippingRateRequest } from "./types";

/**
 * Placeholder for a real carrier API integration (DHL/FedEx/UPS/USPS).
 * `isConfigured()` returns false until a real implementation with real
 * credentials exists — mirrors the `cjDropshippingService.ts` precedent of
 * never faking a live integration's data. `shippingCalculationService` skips
 * any provider where `isConfigured()` is false and falls back to
 * `manualRateProvider`.
 *
 * To add a real carrier: implement this interface in a new file (e.g.
 * `dhlRateProvider.ts`), read credentials from env vars, throw from
 * `getRates` on API failure (the orchestrator catches and falls back — it
 * does not swallow errors silently), and register it in
 * `shippingCalculationService.ts`'s provider list.
 */
export function createUnconfiguredLiveCarrierProvider(name: string): RateProvider {
  return {
    name,
    isConfigured(): boolean {
      return false;
    },
    async getRates(_request: ShippingRateRequest): Promise<ShippingRateQuoteResult> {
      throw new Error(`${name} live carrier provider is not configured.`);
    },
  };
}
