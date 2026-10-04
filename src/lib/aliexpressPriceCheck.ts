/**
 * Pure (no server, no database) price check: compares what each live option
 * of an AliExpress product SELLS for on the website with what AliExpress
 * charges for it right now. Read-only; used by the admin "Check AliExpress
 * options" page.
 *
 * Margin = (sell price - AliExpress price) / sell price. It is BEFORE shipping,
 * payment fees and any other costs, so a "thin" threshold of 20% or more is
 * sensible. Prices are USD minor units (cents).
 */
import type { SourceSku, StoredVariant } from "./aliexpressVariantCompare";

export interface PriceStoredVariant extends StoredVariant {
  priceDeltaMinor: number;
  supplierCostMinor: number | null;
}

export interface PriceOption {
  name: string;
  sellMinor: number;
  aeCostMinor: number;
  marginPct: number; // can be negative (selling below cost)
  importCostMinor: number | null; // AliExpress price when it was imported
  suggestedMinor: number; // price that would give the target margin
}

export type PriceStatus = "OK" | "THIN" | "BELOW_COST" | "NO_MATCH";

export interface PriceCheckResult {
  status: PriceStatus;
  considered: number; // live options matched to an AliExpress price
  belowCost: number;
  thin: number;
  unmatchedLive: number; // live on the website but not found at AliExpress
  worstMarginPct: number | null;
  flagged: PriceOption[]; // below cost or thin, worst first
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function checkPrices(args: {
  basePriceMinor: number;
  productSupplierCostMinor: number | null;
  stored: PriceStoredVariant[];
  source: SourceSku[];
  thinPct: number; // flag margins below this, e.g. 20
  targetPct: number; // suggest prices that reach this margin, e.g. 30
}): PriceCheckResult {
  const { basePriceMinor, productSupplierCostMinor, stored, source, thinPct, targetPct } = args;
  const buyable = source.filter((s) => s.stock !== 0 && s.priceMinorUsd > 0);

  const pairs: { name: string; sellMinor: number; aeCostMinor: number; importCostMinor: number | null }[] = [];
  let unmatchedLive = 0;

  if (stored.length === 0) {
    // No options on the site: the product's own price against AliExpress's cheapest buyable option.
    if (buyable.length > 0) {
      const cheapest = Math.min(...buyable.map((s) => s.priceMinorUsd));
      pairs.push({ name: "(product price)", sellMinor: basePriceMinor, aeCostMinor: cheapest, importCostMinor: productSupplierCostMinor });
    }
  } else {
    const bySku = new Map(buyable.map((s) => [s.skuId, s]));
    const byName = new Map(buyable.map((s) => [norm(s.name), s]));
    for (const v of stored.filter((x) => x.stock > 0)) {
      const match = (v.sku ? bySku.get(v.sku) : undefined) ?? byName.get(norm(v.name));
      if (!match) {
        unmatchedLive++;
        continue;
      }
      pairs.push({
        name: v.name,
        sellMinor: basePriceMinor + v.priceDeltaMinor,
        aeCostMinor: match.priceMinorUsd,
        importCostMinor: v.supplierCostMinor,
      });
    }
  }

  const options: PriceOption[] = pairs.map((p) => ({
    ...p,
    marginPct: p.sellMinor > 0 ? ((p.sellMinor - p.aeCostMinor) / p.sellMinor) * 100 : -100,
    suggestedMinor: Math.ceil(p.aeCostMinor / (1 - targetPct / 100)),
  }));

  const belowCost = options.filter((o) => o.sellMinor < o.aeCostMinor).length;
  const thinOnly = options.filter((o) => o.sellMinor >= o.aeCostMinor && o.marginPct < thinPct).length;
  const flagged = options.filter((o) => o.marginPct < thinPct).sort((a, b) => a.marginPct - b.marginPct);

  let status: PriceStatus = "OK";
  if (options.length === 0) status = "NO_MATCH";
  else if (belowCost > 0) status = "BELOW_COST";
  else if (thinOnly > 0) status = "THIN";

  return {
    status,
    considered: options.length,
    belowCost,
    thin: thinOnly,
    unmatchedLive,
    worstMarginPct: options.length ? Math.min(...options.map((o) => o.marginPct)) : null,
    flagged,
  };
}
