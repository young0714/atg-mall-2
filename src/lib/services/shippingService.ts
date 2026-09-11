import "server-only";
import { db } from "@/lib/db";
import type { Country, ShippingMethod } from "@prisma/client";
import { currencyConversionService } from "./currencyConversionService";
import type { Currency } from "@prisma/client";

/**
 * ShippingService — the international shipping calculator.
 *
 * Rates are read from the admin-managed `ShippingRate` table (per origin
 * country + destination country + method), never hardcoded here as "real"
 * carrier pricing. If no admin rate exists yet for a lane, this service
 * returns `null` rather than inventing a number — the UI must say "not yet
 * available" instead of showing a fabricated price.
 */

export interface ShippingQuote {
  method: ShippingMethod;
  originCountry: string;
  destinationCountry: Country;
  billableWeightGrams: number;
  pricePerKgMinor: number;
  currency: Currency;
  estimatedCostMinor: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  notes: string | null;
  isRateConfigured: true;
}

export interface ShippingService {
  getQuote(params: {
    destinationCountry: Country;
    method: ShippingMethod;
    weightGrams: number;
    originCountry?: string;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  }): Promise<ShippingQuote | null>;
  listAvailableMethods(destinationCountry: Country, originCountry?: string): Promise<ShippingMethod[]>;
  convertQuoteTo(quote: ShippingQuote, currency: Currency): ShippingQuote;
}

// Volumetric divisor commonly used for air freight (cm3 / divisor = kg).
const VOLUMETRIC_DIVISOR = 5000;

class DefaultShippingService implements ShippingService {
  async getQuote({
    destinationCountry,
    method,
    weightGrams,
    originCountry = "China",
    lengthCm,
    widthCm,
    heightCm,
  }: {
    destinationCountry: Country;
    method: ShippingMethod;
    weightGrams: number;
    originCountry?: string;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  }): Promise<ShippingQuote | null> {
    const rate = await db.shippingRate.findUnique({
      where: { originCountry_destinationCountry_method: { originCountry, destinationCountry, method } },
    });
    if (!rate || !rate.isActive) return null;

    let volumetricGrams = 0;
    if (lengthCm && widthCm && heightCm && (method === "AIR_FREIGHT" || method === "COURIER")) {
      volumetricGrams = ((lengthCm * widthCm * heightCm) / VOLUMETRIC_DIVISOR) * 1000;
    }

    const billableGrams = Math.max(
      weightGrams,
      volumetricGrams,
      rate.minChargeableWeightGrams,
    );
    const billableKg = billableGrams / 1000;
    const estimatedCostMinor = Math.round(billableKg * rate.pricePerKgMinor);

    return {
      method,
      originCountry,
      destinationCountry,
      billableWeightGrams: billableGrams,
      pricePerKgMinor: rate.pricePerKgMinor,
      currency: rate.currency,
      estimatedCostMinor,
      estimatedDaysMin: rate.estimatedDaysMin,
      estimatedDaysMax: rate.estimatedDaysMax,
      notes: rate.notes,
      isRateConfigured: true,
    };
  }

  async listAvailableMethods(destinationCountry: Country, originCountry = "China"): Promise<ShippingMethod[]> {
    const rates = await db.shippingRate.findMany({
      where: { destinationCountry, originCountry, isActive: true },
      select: { method: true },
    });
    return rates.map((r) => r.method);
  }

  convertQuoteTo(quote: ShippingQuote, currency: Currency): ShippingQuote {
    if (quote.currency === currency) return quote;
    return {
      ...quote,
      pricePerKgMinor: currencyConversionService.convert(
        quote.pricePerKgMinor,
        quote.currency,
        currency,
      ),
      estimatedCostMinor: currencyConversionService.convert(
        quote.estimatedCostMinor,
        quote.currency,
        currency,
      ),
      currency,
    };
  }
}

export const shippingService: ShippingService = new DefaultShippingService();
