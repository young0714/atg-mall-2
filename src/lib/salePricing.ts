/**
 * Site-wide sale pricing — pure (no database), shared by the shop grid, product
 * page, cart, checkout, order placement and the admin screen, so every one of
 * them shows and charges exactly the same price. Prices are minor units
 * (cents) in the product's own base currency.
 *
 * The sale price is the normal price less the sale percent, tidied to a "...99"
 * price (13.99, 38.99). It only keeps the tidy price if the real saving stays
 * within 3 points of the headline percent; otherwise it uses the exact amount.
 */
import { isLineEligible } from "./couponRules";

export interface SaleRule {
  percentOff: number;
  startsAt: Date;
  endsAt: Date; // inclusive
  isActive: boolean;
  headline: string | null;
  showCountdown: boolean;
}

export interface SaleProduct {
  noCoupons: boolean;
  sellerId: string | null;
  sourcePlatform: string;
}

export function isSaleLive(sale: SaleRule | null | undefined, now: Date = new Date()): sale is SaleRule {
  return !!sale && sale.isActive && sale.percentOff >= 1 && sale.percentOff <= 90 && now >= sale.startsAt && now <= sale.endsAt;
}

/** Same exclusions as coupons: "No coupons or sale discounts" ticked, marketplace sellers' items, affiliate items. */
export function saleEligible(product: SaleProduct): boolean {
  return isLineEligible(product);
}

const TOLERANCE_POINTS = 3;

export function salePriceMinor(listMinor: number, percentOff: number): number {
  if (!(listMinor > 0) || !(percentOff >= 1)) return listMinor;
  const target = (listMinor * (100 - percentOff)) / 100;
  const exact = Math.max(1, Math.round(target));
  const tidy = [Math.ceil(target / 100) * 100 - 1, Math.floor(target / 100) * 100 - 1]
    .filter((c) => c > 0 && c < listMinor)
    .sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
  if (tidy !== undefined) {
    const actual = ((listMinor - tidy) / listMinor) * 100;
    if (Math.abs(actual - percentOff) <= TOLERANCE_POINTS) return tidy;
  }
  return exact < listMinor ? exact : listMinor;
}

export interface PriceResult {
  listMinor: number; // the normal price
  saleMinor: number; // what is charged (equals listMinor when not on sale)
  onSale: boolean;
  percentOff: number; // the real saving, rounded: what the tag shows
}

/** The price for one item (list = base price plus any option difference). */
export function priceWithSale(listMinor: number, product: SaleProduct, sale: SaleRule | null | undefined, now?: Date): PriceResult {
  const none = { listMinor, saleMinor: listMinor, onSale: false, percentOff: 0 };
  if (!isSaleLive(sale, now) || !saleEligible(product)) return none;
  const saleMinor = salePriceMinor(listMinor, sale.percentOff);
  if (saleMinor >= listMinor) return none;
  return { listMinor, saleMinor, onSale: true, percentOff: Math.round(((listMinor - saleMinor) / listMinor) * 100) };
}

export const defaultSaleHeadline = (percentOff: number) => `Launch sale: up to ${percentOff}% OFF`;
