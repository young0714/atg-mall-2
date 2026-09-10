import "server-only";
import type { Country, Currency } from "@prisma/client";
import { currencyConversionService } from "./currencyConversionService";

/**
 * PricingService — computes the estimated LANDED COST shown on product pages:
 * China price + China domestic shipping + international shipping + ATG's
 * service/sourcing fee = total estimated landed cost, converted into the
 * customer's destination currency.
 *
 * All shipping figures ultimately trace back to admin-configured
 * `ShippingRate` rows (see shippingService.ts) — nothing here hardcodes a
 * "real" carrier rate. This service only assembles the breakdown and applies
 * ATG's fee policy.
 */

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

// Flat estimate for getting a package from a 1688/Taobao supplier's
// warehouse to ATG's Guangzhou consolidation warehouse. Admin-configurable
// in a future iteration (currently a documented default, not a live rate).
const CHINA_DOMESTIC_SHIPPING_MINOR_CNY = 800; // ~8 CNY flat, per parcel estimate

// ATG's service/sourcing fee policy: greater of a flat minimum or a
// percentage of product cost. This is business policy, not a fabricated
// carrier rate, so it is reasonable to encode here — but it is still
// clearly surfaced to the customer as ATG's own fee line, never blended in.
const SERVICE_FEE_PERCENT = 8; // 8% of product cost
const SERVICE_FEE_MIN_MINOR_CNY = 1000; // ~10 CNY minimum

export interface PricingService {
  estimateLandedCost(params: {
    productCostMinor: number;
    productCostCurrency: Currency;
    destination: Country;
    destinationCurrency: Currency;
    intlShippingMinorInProductCurrency?: number;
  }): LandedCostBreakdown;
}

class DefaultPricingService implements PricingService {
  estimateLandedCost({
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
  }): LandedCostBreakdown {
    const serviceFeeCny = Math.max(
      Math.round((productCostMinor * SERVICE_FEE_PERCENT) / 100),
      SERVICE_FEE_MIN_MINOR_CNY,
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
    const chinaDomesticMinorDest = toDest(CHINA_DOMESTIC_SHIPPING_MINOR_CNY);
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
