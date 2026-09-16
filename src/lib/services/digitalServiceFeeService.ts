import "server-only";
import { currencyConversionService } from "./currencyConversionService";
import type { Currency } from "@prisma/client";

/**
 * ATG's own service fee on top of face value for each Digital Services
 * flow — sized against real Reloadly cost data pulled live on 2026-09-16:
 *
 * - Airtime carries a built-in wholesale discount that varies by operator
 *   (roughly 2-6% across the markets ATG serves, never negative) — a
 *   deliberate decision (2026-09-16) leaves this at 0% and lets that
 *   built-in discount be the entire margin, since even the thinnest
 *   operators are breakeven rather than a loss at face-value pricing.
 *   The "no fees on airtime top-ups" angle is worth more than the extra
 *   margin a fee would add — revisit if Reloadly's rates ever go negative.
 * - Gift cards often cost MORE than face value — Reloadly charges a flat
 *   ~$1 "sender fee" on most brands, which is a real loss on small
 *   denominations if sold at face value. The flat component here is sized
 *   to absorb that; the percentage on top is where the real margin is.
 * - Utility bills carry zero built-in margin: every Nigerian biller
 *   checked has 0% fee/discount on both the local and international
 *   sides. The fee here is the entire margin — kept thin since bills are
 *   a price-sensitive recurring necessity, not a discretionary purchase.
 */

const AIRTIME_FEE_RATE = 0; // no fee — see comment above
const UTILITY_BILL_FEE_RATE = 0.015; // 1.5%
const GIFT_CARD_FEE_RATE = 0.04; // 4%
const GIFT_CARD_FLAT_FEE_USD_MINOR = 150; // $1.50 — covers Reloadly's own flat sender fee

/** amountMinor is face value, in chargeCurrency. Returns the fee, also in chargeCurrency. */
export function calculateAirtimeFeeMinor(amountMinor: number): number {
  return Math.round(amountMinor * AIRTIME_FEE_RATE);
}

/** amountMinor is face value, in chargeCurrency. Returns the fee, also in chargeCurrency. */
export function calculateUtilityBillFeeMinor(amountMinor: number): number {
  return Math.round(amountMinor * UTILITY_BILL_FEE_RATE);
}

/** amountMinor is face value, in chargeCurrency. Returns the fee, also in chargeCurrency. */
export function calculateGiftCardFeeMinor(amountMinor: number, chargeCurrency: Currency): number {
  const flatFeeMinor =
    chargeCurrency === "USD"
      ? GIFT_CARD_FLAT_FEE_USD_MINOR
      : currencyConversionService.convert(GIFT_CARD_FLAT_FEE_USD_MINOR, "USD", chargeCurrency);
  const percentageFeeMinor = Math.round(amountMinor * GIFT_CARD_FEE_RATE);
  return flatFeeMinor + percentageFeeMinor;
}
