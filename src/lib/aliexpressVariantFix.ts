/**
 * Works out how to bring one AliExpress product's saved options in line with
 * what AliExpress offers now. Pure (no database, no network): the admin
 * "Check AliExpress options" page runs it to preview and again to apply.
 *
 *  - ADD options AliExpress has that the website lacks (in stock only; the
 *    supplier's "(old)" size labels are skipped), priced at AliExpress's price
 *    times this product's own existing markup.
 *  - RETIRE options AliExpress no longer lists by setting stock to 0 (never
 *    deleted, so past orders stay intact).
 */
import { compare, type SourceSku, type StoredVariant } from "./aliexpressVariantCompare";

export interface StoredVariantFull extends StoredVariant {
  priceDeltaMinor: number;
  supplierCostMinor: number | null;
}

export interface PlannedAdd {
  name: string;
  sku: string;
  attributes: Record<string, string>;
  supplierCostMinor: number; // AliExpress price, USD minor units
  sellPriceMinor: number; // what the customer pays for this option, USD minor units
  priceDeltaMinor: number; // sellPrice - product base price
}

export interface FixPlan {
  toAdd: PlannedAdd[];
  toRetire: { id: string; name: string }[];
  skippedSoldOut: string[];
  skippedOld: string[];
  markup: number | null; // sell price / AliExpress price
  markupSource: "options" | "product" | "none";
  warnings: string[];
}

const OLD_LABEL = /[（(]\s*old\s*[）)]/i;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function planFix(args: {
  basePriceMinor: number;
  productSupplierCostMinor: number | null;
  stored: StoredVariantFull[];
  source: SourceSku[];
}): FixPlan {
  const { basePriceMinor, productSupplierCostMinor, stored, source } = args;
  const c = compare(stored, source);
  const warnings: string[] = [];

  // This product's own markup: what customers pay for its existing options
  // divided by what AliExpress charged us for them at import.
  const optionRatios = stored
    .filter((v) => (v.supplierCostMinor ?? 0) > 0)
    .map((v) => (basePriceMinor + v.priceDeltaMinor) / v.supplierCostMinor!)
    .filter((r) => Number.isFinite(r) && r > 0);
  let markup: number | null = null;
  let markupSource: FixPlan["markupSource"] = "none";
  if (optionRatios.length > 0) {
    markup = median(optionRatios);
    markupSource = "options";
  } else if ((productSupplierCostMinor ?? 0) > 0) {
    markup = basePriceMinor / productSupplierCostMinor!;
    markupSource = "product";
  }
  if (markup !== null && markup < 1) {
    warnings.push("Existing prices are below AliExpress cost; new options are priced at cost (no markup) instead.");
    markup = 1;
  }

  const toAdd: PlannedAdd[] = [];
  const skippedSoldOut: string[] = [];
  const skippedOld: string[] = [];
  const seen = new Set<string>();
  for (const s of c.missingSkus) {
    if (seen.has(s.skuId)) continue;
    seen.add(s.skuId);
    if (OLD_LABEL.test(s.name) || Object.values(s.attributes).some((v) => OLD_LABEL.test(v))) {
      skippedOld.push(s.name);
      continue;
    }
    if (s.stock === 0 || s.priceMinorUsd <= 0) {
      skippedSoldOut.push(s.name);
      continue;
    }
    const sell = markup === null ? basePriceMinor : Math.round(s.priceMinorUsd * markup);
    toAdd.push({
      name: s.name,
      sku: s.skuId,
      attributes: s.attributes,
      supplierCostMinor: s.priceMinorUsd,
      sellPriceMinor: sell,
      priceDeltaMinor: sell - basePriceMinor,
    });
  }
  if (toAdd.length > 0 && markup === null) {
    warnings.push("No supplier cost saved for this product, so new options are priced at the product's base price. Check them.");
  }

  const toRetire = c.extraOnSite.filter((v) => v.stock > 0).map((v) => ({ id: v.id, name: v.name }));
  const retiredIds = new Set(toRetire.map((v) => v.id));
  const stillBuyable = stored.filter((v) => v.stock > 0 && !retiredIds.has(v.id)).length + toAdd.length;
  if ((toAdd.length > 0 || toRetire.length > 0) && stillBuyable === 0) {
    warnings.push("After this fix nothing would be buyable — consider hiding the product instead.");
  }

  return { toAdd, toRetire, skippedSoldOut, skippedOld, markup, markupSource, warnings };
}
