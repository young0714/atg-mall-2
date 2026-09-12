import "server-only";
import { cache } from "react";
import type { Country, Currency, StoreCountry } from "@prisma/client";
import { currencyConversionService } from "./currencyConversionService";
import { shippingService } from "./shippingService";
import { storeCountryToShippingOrigin } from "./storeOrigin";
import { db } from "@/lib/db";

/**
 * PricingService — computes the estimated LANDED COST shown on product pages:
 * product price + domestic shipping (to ATG's consolidation warehouse) +
 * warehouse/handling + international shipping + ATG's service/sourcing fee
 * = total estimated landed cost, converted into the customer's destination
 * currency.
 *
 * International shipping is calculated from the product's real weight
 * against the admin-configured `ShippingRate` table (see
 * shippingService.ts), using Air Freight as the display basis — the same
 * per-kg rates checkout itself uses. If no rate is configured for that
 * origin/destination lane yet (or the product's weight is unknown), this
 * falls back to a rough cost-based formula rather than showing nothing, but
 * always prefers the real weight-based figure when one is available.
 *
 * The service-fee policy and domestic-shipping/warehouse-handling estimates
 * come from the admin-editable `PricingPolicy` table (see /admin/settings)
 * — one row per sourcing origin (China/USA/UK) — falling back to honest
 * zero defaults only if a given origin's row is somehow missing.
 */

const DEFAULT_POLICY = {
  currency: "CNY" as Currency,
  domesticShippingMinor: 0,
  serviceFeePercent: 0,
  serviceFeeMinMinor: 0,
  warehouseHandlingFeeMinor: 0,
};

// React's cache() dedupes this per origin within a single request/render —
// every product card on a listing page shares one DB read per origin
// instead of one each.
const getPricingPolicy = cache(async (originCountry: StoreCountry) => {
  const policy = await db.pricingPolicy.findUnique({ where: { originCountry } });
  return {
    currency: policy?.currency ?? DEFAULT_POLICY.currency,
    domesticShippingMinor: policy?.domesticShippingMinor ?? DEFAULT_POLICY.domesticShippingMinor,
    serviceFeePercent: policy?.serviceFeePercent ?? DEFAULT_POLICY.serviceFeePercent,
    serviceFeeMinMinor: policy?.serviceFeeMinMinor ?? DEFAULT_POLICY.serviceFeeMinMinor,
    warehouseHandlingFeeMinor: policy?.warehouseHandlingFeeMinor ?? DEFAULT_POLICY.warehouseHandlingFeeMinor,
  };
});

export interface LandedCostBreakdown {
  productCostMinor: number;
  productCostCurrency: Currency;
  domesticShippingMinor: number;
  warehouseHandlingFeeMinor: number;
  intlShippingMinor: number;
  serviceFeeMinor: number;
  totalMinor: number;
  currency: Currency;
  isEstimate: true;
  intlShippingIsWeightBased: boolean;
}

export interface PricingService {
  estimateLandedCost(params: {
    productCostMinor: number;
    productCostCurrency: Currency;
    destination: Country;
    destinationCurrency: Currency;
    originCountry?: StoreCountry;
    weightGrams?: number;
    intlShippingMinorInProductCurrency?: number;
  }): Promise<LandedCostBreakdown>;
}

class DefaultPricingService implements PricingService {
  async estimateLandedCost({
    productCostMinor,
    productCostCurrency,
    destination,
    destinationCurrency,
    originCountry = "CHINA",
    weightGrams,
    intlShippingMinorInProductCurrency,
  }: {
    productCostMinor: number;
    productCostCurrency: Currency;
    destination: Country;
    destinationCurrency: Currency;
    originCountry?: StoreCountry;
    weightGrams?: number;
    intlShippingMinorInProductCurrency?: number;
  }): Promise<LandedCostBreakdown> {
    const policy = await getPricingPolicy(originCountry);

    const serviceFeeInPolicyCurrency = Math.max(
      Math.round((productCostMinor * policy.serviceFeePercent) / 100),
      policy.serviceFeeMinMinor,
    );

    const toDest = (amountInProductCurrency: number) =>
      currencyConversionService.convert(
        amountInProductCurrency,
        productCostCurrency,
        destinationCurrency,
      );
    const policyToDest = (amountInPolicyCurrency: number) =>
      currencyConversionService.convert(amountInPolicyCurrency, policy.currency, destinationCurrency);

    // Prefer a real weight × admin-per-kg-rate quote (same rates checkout
    // uses) over the rough cost-based formula, when we have a weight and an
    // explicit override wasn't already supplied.
    let intlShippingMinorDest: number;
    let intlShippingIsWeightBased = false;
    if (intlShippingMinorInProductCurrency === undefined && weightGrams) {
      const quote = await shippingService.getQuote({
        destinationCountry: destination,
        method: "AIR_FREIGHT",
        weightGrams,
        originCountry: storeCountryToShippingOrigin(originCountry),
      });
      if (quote) {
        intlShippingMinorDest = currencyConversionService.convert(
          quote.estimatedCostMinor,
          quote.currency,
          destinationCurrency,
        );
        intlShippingIsWeightBased = true;
      } else {
        intlShippingMinorDest = toDest(Math.round(productCostMinor * 0.35 + 2500));
      }
    } else {
      const intlShippingInProductCurrency =
        intlShippingMinorInProductCurrency ?? Math.round(productCostMinor * 0.35 + 2500);
      intlShippingMinorDest = toDest(intlShippingInProductCurrency);
    }

    const productCostMinorDest = toDest(productCostMinor);
    const domesticShippingMinorDest = policyToDest(policy.domesticShippingMinor);
    const warehouseHandlingFeeMinorDest = policyToDest(policy.warehouseHandlingFeeMinor);
    const serviceFeeMinorDest = policyToDest(serviceFeeInPolicyCurrency);

    const totalMinor =
      productCostMinorDest +
      domesticShippingMinorDest +
      warehouseHandlingFeeMinorDest +
      intlShippingMinorDest +
      serviceFeeMinorDest;

    return {
      productCostMinor: productCostMinorDest,
      productCostCurrency: destinationCurrency,
      domesticShippingMinor: domesticShippingMinorDest,
      warehouseHandlingFeeMinor: warehouseHandlingFeeMinorDest,
      intlShippingMinor: intlShippingMinorDest,
      serviceFeeMinor: serviceFeeMinorDest,
      totalMinor,
      currency: destinationCurrency,
      isEstimate: true,
      intlShippingIsWeightBased,
    };
  }
}

export const pricingService: PricingService = new DefaultPricingService();
