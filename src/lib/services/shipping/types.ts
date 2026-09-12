import type { ShippingRateSource } from "@prisma/client";

/**
 * Shared types for the shipping calculation engine (rate-card based, with
 * room for a live carrier API to plug into the same shape later).
 */

export interface PackageDetails {
  weightGrams: number;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}

export interface ShippingRateRequest {
  originIso: string; // ShippingOrigin.countryIso, e.g. "CN"
  destinationIso: string; // DestinationCountry.isoCode, e.g. "GM"
  destinationRegion?: string | null;
  package: PackageDetails;
}

// One priced service-level option for a single origin -> destination lane.
export interface ShippingRateOption {
  serviceLevelId: string;
  serviceLevelName: string;
  serviceLevelSortOrder: number;
  carrierName: string;
  carrierId: string | null;
  trackingAvailable: boolean;
  actualWeightGrams: number;
  volumetricWeightGrams: number;
  chargeableWeightGrams: number;
  carrierCostMinor: number; // before markup/handling
  markupMinor: number;
  handlingFeeMinor: number;
  customerPriceMinor: number; // carrierCost + markup + handling (no customs)
  currency: string; // plain ISO string, as rate cards are priced
  estimatedDeliveryDaysMin: number;
  estimatedDeliveryDaysMax: number;
  rateSource: ShippingRateSource;
  rawProviderResponse?: unknown;
}

// Result of quoting one origin -> destination lane: zero or more options.
export interface ShippingRateQuoteResult {
  originIso: string;
  destinationIso: string;
  options: ShippingRateOption[];
  // Set when nothing could be quoted (no rate card, and no live API) — the
  // caller must show a clear message, never fall back to $0.
  unavailableReason?: string;
}

export interface CustomsDisclosure {
  isConfigured: boolean;
  estimatedDutyPercent: number | null;
  importTaxPercent: number | null;
  customsProcessingFeeMinor: number | null;
  currency: string | null;
  notes: string | null;
  disclaimer: string;
}

// The one required disclaimer whenever duties/taxes are not guaranteed to be
// included in the price the customer sees — must never be omitted or
// softened, per the shipping-engine spec.
export const CUSTOMS_DISCLAIMER =
  "This price does not include customs duties, import taxes, or clearance fees, which may be charged by your country's customs authority on delivery. ATG Mall does not collect or remit these on your behalf.";
