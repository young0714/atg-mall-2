import type { ShippingRateRequest, ShippingRateQuoteResult } from "./types";

/**
 * A rate provider knows how to quote one origin -> destination lane. There
 * are (and will be) multiple implementations behind this interface:
 * `manualRateProvider` (admin-configured rate cards, always available) and,
 * later, `liveCarrierProvider` implementations per real carrier (DHL/FedEx/
 * UPS/USPS APIs). `shippingCalculationService` orchestrates between them —
 * individual providers never decide fallback behavior themselves.
 */
export interface RateProvider {
  readonly name: string;
  isConfigured(): boolean;
  getRates(request: ShippingRateRequest): Promise<ShippingRateQuoteResult>;
}
