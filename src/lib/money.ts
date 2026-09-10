import type { Currency } from "@prisma/client";

// All money in this codebase is stored as integer MINOR units (kobo, butut,
// cents, fen). These helpers are the only place that should ever multiply or
// divide a money value by 100 — never scatter that math through the UI.

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  NGN: "₦",
  GMD: "D",
  USD: "$",
  EUR: "€",
  GBP: "£",
  CNY: "¥",
};

export const CURRENCY_LOCALE: Record<Currency, string> = {
  NGN: "en-NG",
  GMD: "en-GM",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  CNY: "zh-CN",
};

export function minorToMajor(amountMinor: number): number {
  return amountMinor / 100;
}

export function majorToMinor(amountMajor: number): number {
  return Math.round(amountMajor * 100);
}

export function formatMoney(amountMinor: number, currency: Currency): string {
  const major = minorToMajor(amountMinor);
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
      style: "currency",
      currency,
      currencyDisplay: currency === "GMD" ? "code" : "symbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${CURRENCY_SYMBOLS[currency]}${major.toLocaleString()}`;
  }
}

export function sumMinor(...amounts: number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
