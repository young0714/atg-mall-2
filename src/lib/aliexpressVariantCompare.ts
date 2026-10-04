/**
 * Pure (no server, no database) comparison of a product's saved options
 * against what AliExpress offers, shared by the admin "Check AliExpress
 * options" page and the audit-aliexpress-variants.ts script. Read-only.
 */

export interface SourceSku {
  skuId: string;
  name: string;
  attributes: Record<string, string>;
  priceMinorUsd: number;
  stock: number | null;
}
export interface StoredVariant {
  id: string;
  name: string;
  sku: string | null;
  attributes: unknown;
  stock: number;
}

export type Status =
  | "OK"
  | "MISSING_OPTIONS" // AliExpress has options the website lacks
  | "NO_VARIANTS_ON_SITE" // website has none at all, AliExpress has several
  | "ONLY_EXTRA_ON_SITE" // website has options AliExpress no longer lists
  | "NOT_FOUND_AT_SOURCE"
  | "SOURCE_ERROR";

export interface Comparison {
  status: Status;
  siteVariants: number;
  sourceSkus: number;
  missingSkus: SourceSku[];
  extraOnSite: StoredVariant[];
  // e.g. { Size: ["XL","2XL"], Color: ["Red"] } — values AliExpress has that no website variant carries
  missingValuesByOption: Record<string, string[]>;
  // Whole options (like "Size") AliExpress has that no website variant carries at all.
  missingOptionNames: string[];
  soldOutAtSource: number;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function storedAttrs(v: StoredVariant): Record<string, string> {
  const a = v.attributes;
  if (!a || typeof a !== "object" || Array.isArray(a)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(a as Record<string, unknown>)) if (typeof val === "string") out[k] = val;
  return out;
}

export function compare(stored: StoredVariant[], source: SourceSku[]): Comparison {
  const storedSkus = new Set(stored.map((v) => v.sku).filter((s): s is string => !!s));
  const storedNames = new Set(stored.map((v) => norm(v.name)));
  const sourceSkuIds = new Set(source.map((s) => s.skuId));
  const sourceNames = new Set(source.map((s) => norm(s.name)));

  const missingSkus = source.filter((s) => !storedSkus.has(s.skuId) && !storedNames.has(norm(s.name)));
  const extraOnSite = stored.filter((v) => !(v.sku && sourceSkuIds.has(v.sku)) && !sourceNames.has(norm(v.name)));

  // Option names + values, compared case/space-insensitively. Only the
  // site's variants that still exist at the source count as "carried".
  const siteValues = new Map<string, Set<string>>(); // normalised option name -> normalised values
  for (const v of stored) {
    for (const [k, val] of Object.entries(storedAttrs(v))) {
      const key = norm(k);
      if (!siteValues.has(key)) siteValues.set(key, new Set());
      siteValues.get(key)!.add(norm(val));
    }
  }
  const missingValuesByOption: Record<string, string[]> = {};
  const missingOptionNames: string[] = [];
  const sourceOptions = new Map<string, { label: string; values: Map<string, string> }>();
  for (const s of source) {
    for (const [k, val] of Object.entries(s.attributes)) {
      const key = norm(k);
      if (!sourceOptions.has(key)) sourceOptions.set(key, { label: k, values: new Map() });
      sourceOptions.get(key)!.values.set(norm(val), val);
    }
  }
  for (const [key, { label, values }] of sourceOptions) {
    const have = siteValues.get(key);
    if (!have) {
      if (stored.length > 0) missingOptionNames.push(label);
      continue;
    }
    const miss = [...values].filter(([n]) => !have.has(n)).map(([, original]) => original);
    if (miss.length) missingValuesByOption[label] = miss;
  }

  let status: Status = "OK";
  if (stored.length === 0 && source.length > 1) status = "NO_VARIANTS_ON_SITE";
  else if (missingSkus.length > 0) status = "MISSING_OPTIONS";
  else if (extraOnSite.length > 0) status = "ONLY_EXTRA_ON_SITE";

  return {
    status,
    siteVariants: stored.length,
    sourceSkus: source.length,
    missingSkus,
    extraOnSite,
    missingValuesByOption,
    missingOptionNames,
    soldOutAtSource: source.filter((s) => s.stock === 0).length,
  };
}

