"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { cjDropshippingService } from "@/lib/services/cjDropshippingService";
import { aliexpressService } from "@/lib/services/aliexpressService";
import { cjToImportable, aliexpressToImportable, type ImportableProduct, type ImportSource } from "@/lib/services/importTypes";
import { revalidatePath } from "next/cache";

export async function searchCjProductsAction(query: string): Promise<ImportableProduct[]> {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  if (!query.trim()) return [];
  const results = await cjDropshippingService.search(query);
  // Search only returns summaries; the workspace fetches full detail (via
  // lookupProductAction) once the admin actually opens one to edit.
  return results.map((p) => ({
    source: "CJ" as const,
    externalId: p.pid,
    name: p.name,
    imageUrl: p.imageUrl,
    images: [p.imageUrl],
    description: null,
    suggestedPriceMinorUsd: p.sellPriceMinorUsd,
    weightGrams: null,
    categoryNameHint: p.categoryName,
    variants: [],
    sourceUrl: p.sourceUrl,
    videoUrl: null,
  }));
}

export async function lookupProductAction(
  source: ImportSource,
  idOrQuery: string,
): Promise<{ ok: true; product: ImportableProduct } | { ok: false; error: string }> {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  try {
    if (source === "CJ") {
      const detail = await cjDropshippingService.getById(idOrQuery);
      if (!detail) return { ok: false, error: "That CJ product wasn't found — it may have been removed." };
      return { ok: true, product: cjToImportable(detail) };
    }

    const productId = aliexpressService.parseProductId(idOrQuery);
    if (!productId) return { ok: false, error: "Couldn't find a product ID in that — paste the AliExpress product link or its numeric ID." };
    const detail = await aliexpressService.getById(productId);
    if (!detail) return { ok: false, error: "That AliExpress product wasn't found — check the link or ID." };
    return { ok: true, product: aliexpressToImportable(detail) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lookup failed" };
  }
}

export interface ImportDraftInput {
  draftId: string;
  source: ImportSource;
  externalId: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  basePriceMinor: number;
  weightGrams: number;
  importVariants: boolean;
  includeVideo: boolean;
  removedImageUrls: string[];
  removedVariantExternalIds: string[];
  // externalId -> chosen price, in minor units — same convention as
  // basePriceMinor. A variant with no entry here falls back to the base
  // price itself (delta 0), same as before this existed.
  variantPrices: Record<string, number>;
}

export interface PersistedDraft {
  draftId: string;
  source: ImportSource;
  externalId: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  thumbnailUrl: string;
  basePriceMinorText: string;
  weightGramsText: string;
  importVariants: boolean;
  includeVideo: boolean;
  removedImageUrls: string[];
  removedVariantExternalIds: string[];
  variantPrices: Record<string, string>;
}

/** Loads this admin's staged batch for a source, so it survives navigating away or reloading. */
export async function listImportDraftsAction(source: ImportSource): Promise<PersistedDraft[]> {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const rows = await db.productImportDraft.findMany({
    where: { createdByUserId: staff.id, source },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    draftId: r.id,
    source: r.source as ImportSource,
    externalId: r.externalId,
    name: r.name,
    slug: r.slug,
    categoryId: r.categoryId,
    description: r.description,
    thumbnailUrl: r.thumbnailUrl,
    basePriceMinorText: String(r.basePriceMinor),
    weightGramsText: String(r.weightGrams),
    importVariants: r.importVariants,
    includeVideo: r.includeVideo,
    removedImageUrls: r.removedImageUrls,
    removedVariantExternalIds: r.removedVariantExternalIds,
    variantPrices: (r.variantPrices as Record<string, string> | null) ?? {},
  }));
}

export interface SaveDraftInput {
  draftId: string | null; // null = new row; otherwise updates the existing staged row
  source: ImportSource;
  externalId: string;
  thumbnailUrl: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  basePriceMinorText: string;
  weightGramsText: string;
  importVariants: boolean;
  includeVideo: boolean;
  removedImageUrls: string[];
  removedVariantExternalIds: string[];
  variantPrices: Record<string, string>;
}

/** Called the moment an admin clicks "Save to Batch" — persists immediately, not just to local state. */
export async function saveImportDraftAction(input: SaveDraftInput): Promise<{ draftId: string }> {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const data = {
    createdByUserId: staff.id,
    source: input.source,
    externalId: input.externalId,
    thumbnailUrl: input.thumbnailUrl,
    name: input.name,
    slug: input.slug,
    categoryId: input.categoryId,
    description: input.description,
    basePriceMinor: Number(input.basePriceMinorText) || 0,
    weightGrams: Number(input.weightGramsText) || 0,
    importVariants: input.importVariants,
    includeVideo: input.includeVideo,
    removedImageUrls: input.removedImageUrls,
    removedVariantExternalIds: input.removedVariantExternalIds,
    variantPrices: input.variantPrices,
  };

  if (input.draftId) {
    const existing = await db.productImportDraft.findUnique({ where: { id: input.draftId } });
    if (existing && existing.createdByUserId === staff.id) {
      const updated = await db.productImportDraft.update({ where: { id: input.draftId }, data });
      return { draftId: updated.id };
    }
  }

  const created = await db.productImportDraft.create({ data });
  return { draftId: created.id };
}

export async function removeImportDraftAction(draftId: string): Promise<void> {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  await db.productImportDraft.deleteMany({ where: { id: draftId, createdByUserId: staff.id } });
}

export interface ImportBatchResult {
  succeeded: { draftId: string; productId: string; name: string }[];
  failed: { draftId: string; name: string; error: string }[];
}

export async function importBatchAction(drafts: ImportDraftInput[]): Promise<ImportBatchResult> {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const result: ImportBatchResult = { succeeded: [], failed: [] };

  for (const draft of drafts) {
    try {
      if (!draft.name || !draft.slug || !draft.categoryId || !Number.isFinite(draft.basePriceMinor) || !Number.isFinite(draft.weightGrams)) {
        throw new Error("Missing a required field");
      }

      // Re-fetch from the source rather than trusting client-submitted
      // images/variants — the admin's "removed" lists only exclude which of
      // the REAL, server-verified images/variants to drop. Re-fetching (not
      // trusting a client-held copy) also means a draft staged days ago and
      // never reopened for editing still imports with the supplier's
      // current images/variants, not a stale snapshot.
      const fresh: ImportableProduct =
        draft.source === "CJ"
          ? await (async () => {
              const d = await cjDropshippingService.getById(draft.externalId);
              if (!d) throw new Error("Product no longer available from CJ");
              return cjToImportable(d);
            })()
          : await (async () => {
              const d = await aliexpressService.getById(draft.externalId);
              if (!d) throw new Error("Product no longer available from AliExpress");
              return aliexpressToImportable(d);
            })();

      const images = fresh.images.filter((url) => !draft.removedImageUrls.includes(url));
      const variants = fresh.variants.filter((v) => !draft.removedVariantExternalIds.includes(v.externalId));

      const store =
        draft.source === "CJ" ? await db.store.findUnique({ where: { slug: "cjdropshipping" } }) : null;

      const product = await db.product.create({
        data: {
          name: draft.name,
          slug: draft.slug,
          description: draft.description,
          categoryId: draft.categoryId,
          basePriceMinor: draft.basePriceMinor,
          baseCurrency: "USD",
          weightGrams: draft.weightGrams,
          sourcePlatform: draft.source === "CJ" ? "CJDROPSHIPPING" : "ALIEXPRESS",
          sourceUrl: fresh.sourceUrl,
          sourceProductId: fresh.externalId,
          supplierCostMinor: fresh.suggestedPriceMinorUsd,
          storeId: store?.id,
          videoUrl: draft.includeVideo ? fresh.videoUrl : null,
          images: { create: images.slice(0, 8).map((url, i) => ({ url, sortOrder: i })) },
          variants: draft.importVariants
            ? {
                create: variants.map((v) => ({
                  name: v.name,
                  sku: v.sku ?? undefined,
                  attributes: v.attributes,
                  priceDeltaMinor: (draft.variantPrices[v.externalId] ?? draft.basePriceMinor) - draft.basePriceMinor,
                  supplierCostMinor: v.supplierPriceMinorUsd,
                })),
              }
            : undefined,
        },
      });

      let auditSummary = `Imported "${product.name}" from ${draft.source === "CJ" ? "CJdropshipping" : "AliExpress"} (batch import)`;
      if (draft.source === "CJ") {
        const addedToCjMyProducts = await cjDropshippingService.addToMyProduct(draft.externalId);
        auditSummary += addedToCjMyProducts ? " and added to CJ My Products" : " (could not register in CJ My Products)";
      }

      await db.auditLog.create({
        data: {
          actorId: staff.id,
          action: draft.source === "CJ" ? "PRODUCT_IMPORTED_FROM_CJ" : "PRODUCT_IMPORTED_FROM_ALIEXPRESS",
          entityType: "Product",
          entityId: product.id,
          summary: auditSummary,
        },
      });

      // The draft's staged row is no longer needed once it's a real Product —
      // delete regardless of who's calling (draftId is now the persisted
      // row's own id, scoped to this admin already via saveImportDraftAction).
      await db.productImportDraft.deleteMany({ where: { id: draft.draftId } });

      result.succeeded.push({ draftId: draft.draftId, productId: product.id, name: product.name });
    } catch (e) {
      result.failed.push({ draftId: draft.draftId, name: draft.name || draft.externalId, error: e instanceof Error ? e.message : "Import failed" });
    }
  }

  if (result.succeeded.length > 0) revalidatePath("/admin/products");
  return result;
}
