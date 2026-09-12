import "server-only";
import { db } from "@/lib/db";
import { currencyConversionService } from "../currencyConversionService";

/**
 * Admin-managed exchange rates (the `CurrencyRate` table) for the shipping
 * engine, replacing the hardcoded `USD_RATES` map in
 * `currencyConversionService.ts` for rate-card currencies — plain ISO
 * strings, so this also supports currencies the bounded `Currency` enum
 * doesn't (ZAR, GHS, XOF, ...). Falls back to the legacy static map only
 * when both currencies happen to be enum-bound and no admin rate exists yet,
 * so nothing breaks mid-rollout before an admin has entered any rates.
 *
 * `isStale` is a signal for the UI/admin dashboard to flag an old rate — it
 * does not block conversion (an old rate is still better than no price).
 */
export interface CurrencyRateResult {
  rate: number;
  isStale: boolean;
  fetchedAt: Date | null;
  source: string;
}

const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LEGACY_ENUM_CURRENCIES = new Set(["USD", "CNY", "NGN", "GMD", "EUR", "GBP"]);

export interface CurrencyRateService {
  getRate(from: string, to: string): Promise<CurrencyRateResult>;
  convert(amountMinor: number, from: string, to: string): Promise<{ amountMinor: number; isStale: boolean }>;
}

class DefaultCurrencyRateService implements CurrencyRateService {
  async getRate(from: string, to: string): Promise<CurrencyRateResult> {
    if (from === to) {
      return { rate: 1, isStale: false, fetchedAt: null, source: "IDENTITY" };
    }

    const direct = await db.currencyRate.findFirst({
      where: { fromCurrency: from, toCurrency: to, isActive: true },
    });
    if (direct) {
      return {
        rate: direct.rate,
        isStale: Date.now() - direct.fetchedAt.getTime() > STALE_THRESHOLD_MS,
        fetchedAt: direct.fetchedAt,
        source: direct.source,
      };
    }

    const inverse = await db.currencyRate.findFirst({
      where: { fromCurrency: to, toCurrency: from, isActive: true },
    });
    if (inverse && inverse.rate !== 0) {
      return {
        rate: 1 / inverse.rate,
        isStale: Date.now() - inverse.fetchedAt.getTime() > STALE_THRESHOLD_MS,
        fetchedAt: inverse.fetchedAt,
        source: inverse.source,
      };
    }

    // Bridge through USD if both legs are configured by an admin.
    if (from !== "USD" && to !== "USD") {
      const [fromToUsd, usdToTarget] = await Promise.all([
        db.currencyRate.findFirst({ where: { fromCurrency: from, toCurrency: "USD", isActive: true } }),
        db.currencyRate.findFirst({ where: { fromCurrency: "USD", toCurrency: to, isActive: true } }),
      ]);
      if (fromToUsd && usdToTarget) {
        const oldestFetch =
          fromToUsd.fetchedAt < usdToTarget.fetchedAt ? fromToUsd.fetchedAt : usdToTarget.fetchedAt;
        return {
          rate: fromToUsd.rate * usdToTarget.rate,
          isStale: Date.now() - oldestFetch.getTime() > STALE_THRESHOLD_MS,
          fetchedAt: oldestFetch,
          source: "BRIDGED",
        };
      }
    }

    if (LEGACY_ENUM_CURRENCIES.has(from) && LEGACY_ENUM_CURRENCIES.has(to)) {
      return {
        rate: currencyConversionService.getRate(from as never, to as never),
        isStale: true,
        fetchedAt: null,
        source: "LEGACY_STATIC",
      };
    }

    throw new Error(`No exchange rate configured for ${from} -> ${to}. Add one in Admin -> Shipping -> Currency Rates.`);
  }

  async convert(amountMinor: number, from: string, to: string): Promise<{ amountMinor: number; isStale: boolean }> {
    const { rate, isStale } = await this.getRate(from, to);
    return { amountMinor: Math.round(amountMinor * rate), isStale };
  }
}

export const currencyRateService: CurrencyRateService = new DefaultCurrencyRateService();
