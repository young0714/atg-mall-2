"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { aliexpressService } from "@/lib/services/aliexpressService";
import { compare, type Status } from "@/lib/aliexpressVariantCompare";
import { planFix, type FixPlan } from "@/lib/aliexpressVariantFix";
import { revalidatePath } from "next/cache";

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
  // AliExpress can't currently supply this product at all (every option sold out / unsaleable).
  unfulfillable: boolean;
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
    unfulfillable: false,
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
        unfulfillable: c.sourceSkus > 0 && c.soldOutAtSource === c.sourceSkus,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (attempt === 2) {
        return { ...base, siteVariants: product.variants.length, note: message, unfulfillable: /unsaleable/i.test(message) };
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
  return base;
}

// ---------------------------------------------------------------------------
// Fixing: add missing options, retire dropped ones, hide unfulfillable products
// ---------------------------------------------------------------------------

export interface FixPreview {
  productId: string;
  ok: boolean;
  note?: string;
  add: { name: string; sellUsd: number; costUsd: number }[];
  retire: string[];
  skippedSoldOut: number;
  skippedOld: number;
  warnings: string[];
}

type Loaded =
  | { ok: false; note: string }
  | {
      ok: true;
      product: { id: string; name: string; slug: string };
      plan: FixPlan;
    };

// Always re-reads the product and asks AliExpress again, so nothing is ever
// applied from a stale screen.
async function loadAndPlan(productId: string): Promise<Loaded> {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      sourcePlatform: true,
      sourceProductId: true,
      basePriceMinor: true,
      baseCurrency: true,
      supplierCostMinor: true,
      variants: {
        select: { id: true, name: true, sku: true, attributes: true, stock: true, priceDeltaMinor: true, supplierCostMinor: true },
      },
    },
  });
  if (!product || product.sourcePlatform !== "ALIEXPRESS" || !product.sourceProductId) {
    return { ok: false, note: "Not an AliExpress product with a saved AliExpress ID." };
  }
  if (product.baseCurrency !== "USD") {
    return { ok: false, note: `Prices are saved in ${product.baseCurrency}, not USD — skipped for safety.` };
  }
  let detail;
  try {
    detail = await aliexpressService.getById(product.sourceProductId);
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : String(e) };
  }
  if (!detail) return { ok: false, note: "AliExpress no longer lists this product." };
  if (detail.variants.length === 0) return { ok: false, note: "AliExpress returned no options — nothing to compare." };

  const plan = planFix({
    basePriceMinor: product.basePriceMinor,
    productSupplierCostMinor: product.supplierCostMinor,
    stored: product.variants,
    source: detail.variants,
  });
  return { ok: true, product: { id: product.id, name: product.name, slug: product.slug }, plan };
}

export async function previewFixAction(productId: string): Promise<FixPreview> {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const loaded = await loadAndPlan(productId);
  if (!loaded.ok) {
    return { productId, ok: false, note: loaded.note, add: [], retire: [], skippedSoldOut: 0, skippedOld: 0, warnings: [] };
  }
  const { plan } = loaded;
  return {
    productId,
    ok: true,
    add: plan.toAdd.map((a) => ({ name: a.name, sellUsd: a.sellPriceMinor / 100, costUsd: a.supplierCostMinor / 100 })),
    retire: plan.toRetire.map((r) => r.name),
    skippedSoldOut: plan.skippedSoldOut.length,
    skippedOld: plan.skippedOld.length,
    warnings: plan.warnings,
  };
}

export interface FixApplied {
  productId: string;
  ok: boolean;
  note?: string;
  added: number;
  retired: number;
}

export async function applyFixAction(productId: string): Promise<FixApplied> {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const loaded = await loadAndPlan(productId);
  if (!loaded.ok) return { productId, ok: false, note: loaded.note, added: 0, retired: 0 };
  const { plan, product } = loaded;
  if (plan.toAdd.length === 0 && plan.toRetire.length === 0) return { productId, ok: true, added: 0, retired: 0, note: "Nothing to change." };

  try {
    await db.$transaction(async (tx) => {
      if (plan.toAdd.length > 0) {
        await tx.productVariant.createMany({
          data: plan.toAdd.map((a) => ({
            productId,
            name: a.name,
            sku: a.sku,
            attributes: a.attributes,
            priceDeltaMinor: a.priceDeltaMinor,
            supplierCostMinor: a.supplierCostMinor,
            stock: 999,
          })),
        });
      }
      if (plan.toRetire.length > 0) {
        await tx.productVariant.updateMany({
          where: { productId, id: { in: plan.toRetire.map((r) => r.id) } },
          data: { stock: 0 },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: staff.id,
          action: "ALIEXPRESS_OPTIONS_SYNCED",
          entityType: "Product",
          entityId: productId,
          summary: `Synced options with AliExpress for "${product.name}": added ${plan.toAdd.length}, retired (sold out) ${plan.toRetire.length}`,
        },
      });
    });
  } catch (e) {
    return { productId, ok: false, note: e instanceof Error ? e.message : String(e), added: 0, retired: 0 };
  }

  revalidatePath(`/product/${product.slug}`);
  revalidatePath(`/admin/products/${productId}`);
  return { productId, ok: true, added: plan.toAdd.length, retired: plan.toRetire.length };
}

export interface HideResult {
  productId: string;
  ok: boolean;
  note?: string;
}

/**
 * Hides (isActive = false) a product — reversible from its admin page. Only
 * allowed when AliExpress itself confirms, right now, that it can't supply
 * the product (every option sold out, or "All SKU Unsaleable").
 */
export async function hideProductAction(productId: string): Promise<HideResult> {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const check = await checkAliExpressProductAction(productId);
  if (!check.unfulfillable) {
    return { productId, ok: false, note: "AliExpress shows this product as available again, so it was not hidden." };
  }
  const product = await db.product.update({
    where: { id: productId },
    data: { isActive: false },
    select: { name: true, slug: true },
  });
  await db.auditLog.create({
    data: {
      actorId: staff.id,
      action: "PRODUCT_HIDDEN_UNFULFILLABLE",
      entityType: "Product",
      entityId: productId,
      summary: `Hid "${product.name}": AliExpress cannot currently supply it${check.note ? ` (${check.note})` : " (all options sold out)"}`,
    },
  });
  revalidatePath(`/product/${product.slug}`);
  revalidatePath("/shop");
  revalidatePath(`/admin/products/${productId}`);
  return { productId, ok: true };
}
