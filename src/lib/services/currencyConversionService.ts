import "server-only";
import type { Currency } from "@prisma/client";

/**
 * CurrencyConversionService — FX conversion abstraction.
 *
 * These are STATIC, CLEARLY-LABELED INDICATIVE RATES for demo/development
 * purposes only — not live market rates. A production deployment must
 * replace `MockCurrencyConversionService` with a `Live` implementation
 * backed by a real FX data provider (e.g. a central bank feed or a paid FX
 * API) and should refresh rates on a schedule rather than hardcoding them.
 */
export interface CurrencyConversionService {
  convert(amountMinor: number, from: Currency, to: Currency): number;
  getRate(from: Currency, to: Currency): number;
  isLive(): boolean;
}

// Units per 1 USD (indicative, as of authoring — NOT live rates).
const USD_RATES: Record<Currency, number> = {
  USD: 1,
  CNY: 7.1,
  NGN: 1550,
  GMD: 72,
  EUR: 0.92,
  GBP: 0.79,
};

class MockCurrencyConversionService implements CurrencyConversionService {
  isLive(): boolean {
    return false;
  }

  getRate(from: Currency, to: Currency): number {
    if (from === to) return 1;
    const usdToFrom = USD_RATES[from];
    const usdToTo = USD_RATES[to];
    return usdToTo / usdToFrom;
  }

  convert(amountMinor: number, from: Currency, to: Currency): number {
    const rate = this.getRate(from, to);
    return Math.round(amountMinor * rate);
  }
}

export const currencyConversionService: CurrencyConversionService =
  new MockCurrencyConversionService();
