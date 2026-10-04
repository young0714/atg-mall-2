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
  variantId: string | null; // null = the product's own price (no options on the site)
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

interface PriceArgs {
  basePriceMinor: number;
  productSupplierCostMinor: number | null;
  stored: PriceStoredVariant[];
  source: SourceSku[];
  thinPct: number; // flag margins below this, e.g. 20
  targetPct: number; // suggest prices that reach this margin, e.g. 30
}

function buildOptions(args: PriceArgs): { options: PriceOption[]; unmatchedLive: number } {
  const { basePriceMinor, productSupplierCostMinor, stored, source, targetPct } = args;
  const buyable = source.filter((s) => s.stock !== 0 && s.priceMinorUsd > 0);

  const pairs: { variantId: string | null; name: string; sellMinor: number; aeCostMinor: number; importCostMinor: number | null }[] = [];
  let unmatchedLive = 0;

  if (stored.length === 0) {
    // No options on the site: the product's own price against AliExpress's cheapest buyable option.
    if (buyable.length > 0) {
      const cheapest = Math.min(...buyable.map((s) => s.priceMinorUsd));
      pairs.push({ variantId: null, name: "(product price)", sellMinor: basePriceMinor, aeCostMinor: cheapest, importCostMinor: productSupplierCostMinor });
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
        variantId: v.id,
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
  return { options, unmatchedLive };
}

export function checkPrices(args: PriceArgs): PriceCheckResult {
  const { thinPct } = args;
  const { options, unmatchedLive } = buildOptions(args);

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

// ---------------------------------------------------------------------------
// Repricing: raise options that sell below the chosen margin up to the target
// ---------------------------------------------------------------------------

export interface RepriceChange {
  variantId: string;
  name: string;
  oldSellMinor: number;
  newSellMinor: number;
  newDeltaMinor: number;
  aeCostMinor: number;
  marginBeforePct: number;
  marginAfterPct: number;
}

export interface ReprisePlanResult {
  changes: RepriceChange[];
  needsManual: number; // below the margin but no option to change (product's own price)
  cheapestAfterMinor: number | null; // cheapest option on sale after the change
  basePriceMinor: number;
  warnings: string[];
}

/** Rounds up to the shop's usual "...99" price style, never below the suggested price. */
export function niceUp(minor: number): number {
  let k = Math.ceil(minor / 100) * 100 - 1;
  if (k < minor) k += 100;
  return k;
}

export function planReprice(args: Omit<PriceArgs, "thinPct"> & { belowPct: number }): ReprisePlanResult {
  const { basePriceMinor, belowPct } = args;
  const { options } = buildOptions({ ...args, thinPct: belowPct });
  const warnings: string[] = [];

  const changes: RepriceChange[] = [];
  let needsManual = 0;
  for (const o of options) {
    if (o.marginPct >= belowPct) continue;
    if (o.variantId === null) {
      needsManual++;
      continue;
    }
    const newSell = niceUp(o.suggestedMinor);
    if (newSell <= o.sellMinor) continue; // only ever raises a price
    changes.push({
      variantId: o.variantId,
      name: o.name,
      oldSellMinor: o.sellMinor,
      newSellMinor: newSell,
      newDeltaMinor: newSell - basePriceMinor,
      aeCostMinor: o.aeCostMinor,
      marginBeforePct: o.marginPct,
      marginAfterPct: ((newSell - o.aeCostMinor) / newSell) * 100,
    });
  }
  changes.sort((a, b) => a.marginBeforePct - b.marginBeforePct);

  const changedIds = new Map(changes.map((c) => [c.variantId, c.newSellMinor]));
  const after = options.map((o) => (o.variantId && changedIds.has(o.variantId) ? changedIds.get(o.variantId)! : o.sellMinor));
  const cheapestAfterMinor = after.length ? Math.min(...after) : null;

  if (changes.some((c) => c.newSellMinor > c.oldSellMinor * 2.5)) {
    warnings.push("Some prices more than double (over 2.5x) — check they are reasonable for the product.");
  }
  if (changes.length > 0 && cheapestAfterMinor !== null && cheapestAfterMinor > basePriceMinor) {
    warnings.push(
      `Shop listings still show the product's base price ($${(basePriceMinor / 100).toFixed(2)}), but the cheapest option is now $${(cheapestAfterMinor / 100).toFixed(2)}. Update the base price on the product page if you want them to match.`,
    );
  }
  return { changes, needsManual, cheapestAfterMinor, basePriceMinor, warnings };
}
