import "server-only";
import { cache } from "react";
import type { Country, Currency } from "@prisma/client";
import { currencyConversionService } from "./currencyConversionService";
import { db } from "@/lib/db";

/**
 * PricingService — computes the estimated LANDED COST shown on product pages:
 * China price + China domestic shipping + international shipping + ATG's
 * service/sourcing fee = total estimated landed cost, converted into the
 * customer's destination currency.
 *
 * All shipping figures ultimately trace back to admin-configured
 * `ShippingRate` rows (see shippingService.ts) — nothing here hardcodes a
 * "real" carrier rate. The ATG service-fee policy and flat China-domestic-
 * shipping estimate come from the admin-editable `PricingPolicy` singleton
 * (see /admin/settings), falling back to these defaults only if that row is
 * somehow missing (e.g. a fresh database before the first seed).
 */

// Defaults, used only if no PricingPolicy row exists yet.
const DEFAULT_CHINA_DOMESTIC_SHIPPING_MINOR_CNY = 800;
const DEFAULT_SERVICE_FEE_PERCENT = 8;
const DEFAULT_SERVICE_FEE_MIN_MINOR_CNY = 1000;

// React's cache() dedupes this within a single request/render — every
// product card on a listing page shares one DB read instead of one each.
const getPricingPolicy = cache(async () => {
  const policy = await db.pricingPolicy.findFirst();
  return {
    serviceFeePercent: policy?.serviceFeePercent ?? DEFAULT_SERVICE_FEE_PERCENT,
    serviceFeeMinMinorCny: policy?.serviceFeeMinMinorCny ?? DEFAULT_SERVICE_FEE_MIN_MINOR_CNY,
    chinaDomesticShippingMinorCny:
      policy?.chinaDomesticShippingMinorCny ?? DEFAULT_CHINA_DOMESTIC_SHIPPING_MINOR_CNY,
  };
});

export interface LandedCostBreakdown {
  productCostMinor: number;
  productCostCurrency: Currency;
  chinaDomesticShippingMinor: number;
  intlShippingMinor: number;
  serviceFeeMinor: number;
  totalMinor: number;
  currency: Currency;
  isEstimate: true;
}

export interface PricingService {
  estimateLandedCost(params: {
    productCostMinor: number;
    productCostCurrency: Currency;
    destination: Country;
    destinationCurrency: Currency;
    intlShippingMinorInProductCurrency?: number;
  }): Promise<LandedCostBreakdown>;
}

class DefaultPricingService implements PricingService {
  async estimateLandedCost({
    productCostMinor,
    productCostCurrency,
    destinationCurrency,
    intlShippingMinorInProductCurrency,
  }: {
    productCostMinor: number;
    productCostCurrency: Currency;
    destination: Country;
    destinationCurrency: Currency;
    intlShippingMinorInProductCurrency?: number;
  }): Promise<LandedCostBreakdown> {
    const policy = await getPricingPolicy();

    const serviceFeeCny = Math.max(
      Math.round((productCostMinor * policy.serviceFeePercent) / 100),
      policy.serviceFeeMinMinorCny,
    );
    const intlShippingCny =
      intlShippingMinorInProductCurrency ?? Math.round(productCostMinor * 0.35 + 2500);

    const toDest = (amountInProductCurrency: number) =>
      currencyConversionService.convert(
        amountInProductCurrency,
        productCostCurrency,
        destinationCurrency,
      );

    const productCostMinorDest = toDest(productCostMinor);
    const chinaDomesticMinorDest = toDest(policy.chinaDomesticShippingMinorCny);
    const intlShippingMinorDest = toDest(intlShippingCny);
    const serviceFeeMinorDest = toDest(serviceFeeCny);

    const totalMinor =
      productCostMinorDest + chinaDomesticMinorDest + intlShippingMinorDest + serviceFeeMinorDest;

    return {
      productCostMinor: productCostMinorDest,
      productCostCurrency: destinationCurrency,
      chinaDomesticShippingMinor: chinaDomesticMinorDest,
      intlShippingMinor: intlShippingMinorDest,
      serviceFeeMinor: serviceFeeMinorDest,
      totalMinor,
      currency: destinationCurrency,
      isEstimate: true,
    };
  }
}

export const pricingService: PricingService = new DefaultPricingService();
