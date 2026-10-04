"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { aliexpressService } from "@/lib/services/aliexpressService";
import { compare, type Status } from "@/lib/aliexpressVariantCompare";

export interface VariantCheckResult {
  productId: string;
  status: Status;
  siteVariants: number;
  sourceSkus: number;
  missingCount: number;
  // "Size: XL, 2XL | Color: Red" — what AliExpress has that the website lacks.
  whatIsMissing: string;
  // The exact missing options, with AliExpress's current price (USD).
  missing: { name: string; priceUsd: number; soldOut: boolean }[];
  extraOnSite: string[];
  soldOutAtSource: number;
  note?: string;
}

/**
 * Read-only. Compares one AliExpress product's saved options with what
 * AliExpress offers right now. Called one product at a time by the check
 * page so no single request runs long. Never writes anything.
 */
export async function checkAliExpressProductAction(productId: string): Promise<VariantCheckResult> {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const base: VariantCheckResult = {
    productId,
    status: "SOURCE_ERROR",
    siteVariants: 0,
    sourceSkus: 0,
    missingCount: 0,
    whatIsMissing: "",
    missing: [],
    extraOnSite: [],
    soldOutAtSource: 0,
  };

  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      sourcePlatform: true,
      sourceProductId: true,
      variants: { select: { id: true, name: true, sku: true, attributes: true, stock: true } },
    },
  });
  if (!product || product.sourcePlatform !== "ALIEXPRESS" || !product.sourceProductId) {
    return { ...base, note: "Not an AliExpress product with a saved AliExpress ID." };
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const detail = await aliexpressService.getById(product.sourceProductId);
      if (!detail) return { ...base, status: "NOT_FOUND_AT_SOURCE", siteVariants: product.variants.length };
      const c = compare(product.variants, detail.variants);
      return {
        productId,
        status: c.status,
        siteVariants: c.siteVariants,
        sourceSkus: c.sourceSkus,
        missingCount: c.missingSkus.length,
        whatIsMissing: [
          ...Object.entries(c.missingValuesByOption).map(([k, v]) => `${k}: ${v.join(", ")}`),
          ...c.missingOptionNames.map((n) => `whole "${n}" option missing`),
        ].join(" | "),
        missing: c.missingSkus.map((s) => ({ name: s.name, priceUsd: s.priceMinorUsd / 100, soldOut: s.stock === 0 })),
        extraOnSite: c.extraOnSite.map((v) => v.name),
        soldOutAtSource: c.soldOutAtSource,
      };
    } catch (e) {
      if (attempt === 2) return { ...base, siteVariants: product.variants.length, note: e instanceof Error ? e.message : String(e) };
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  return base;
}
