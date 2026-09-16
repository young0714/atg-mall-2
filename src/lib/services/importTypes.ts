/**
 * Common "importable product" shape used by the shared batch-staging import
 * UI (ProductImportWorkspace) — deliberately NOT reusing types.ts's
 * RemoteProductSummary/RemoteProductDetail (scoped to the mock 1688/Taobao
 * demo platforms) or CJ's own CjProductSummary/CjProductDetail (whose shape
 * stays faithful to CJ's real API on purpose). Each supplier service keeps
 * its own accurate types; a small adapter here normalizes just enough of
 * each into one shape the shared UI can render and edit generically.
 */

import type { CjProductDetail } from "./cjDropshippingService";
import type { AliExpressProductDetail } from "./aliexpressService";

export type ImportSource = "CJ" | "ALIEXPRESS";

export interface ImportableVariant {
  externalId: string;
  name: string;
  sku: string | null;
  attributes: Record<string, string>;
}

export interface ImportableProduct {
  source: ImportSource;
  externalId: string;
  name: string;
  imageUrl: string;
  images: string[];
  description: string | null;
  suggestedPriceMinorUsd: number;
  weightGrams: number | null;
  categoryNameHint: string | null;
  variants: ImportableVariant[];
  sourceUrl: string;
  videoUrl: string | null;
}

export function cjToImportable(d: CjProductDetail): ImportableProduct {
  return {
    source: "CJ",
    externalId: d.pid,
    name: d.name,
    imageUrl: d.imageUrl,
    images: d.images,
    description: d.description,
    suggestedPriceMinorUsd: d.sellPriceMinorUsd,
    weightGrams: d.weightGrams,
    categoryNameHint: d.categoryName,
    variants: d.variants.map((v) => ({
      externalId: v.vid,
      name: v.name,
      sku: v.sku || null,
      attributes: v.attributes,
    })),
    sourceUrl: d.sourceUrl,
    videoUrl: d.videoUrl,
  };
}

export function aliexpressToImportable(d: AliExpressProductDetail): ImportableProduct {
  return {
    source: "ALIEXPRESS",
    externalId: d.productId,
    name: d.name,
    imageUrl: d.imageUrl,
    images: d.images,
    description: d.description,
    suggestedPriceMinorUsd: d.sellPriceMinorUsd,
    weightGrams: d.weightGrams,
    categoryNameHint: null,
    variants: d.variants.map((v) => ({
      externalId: v.skuId,
      name: v.name,
      sku: v.skuId || null,
      attributes: v.attributes,
    })),
    sourceUrl: d.sourceUrl,
    // AliExpress's Dropshipping API doesn't expose a usable/resolvable video
    // URL in what's available to this app — see aliexpressService.ts.
    videoUrl: null,
  };
}
