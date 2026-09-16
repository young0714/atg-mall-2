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
  keptImageUrls: string[];
  keptVariantExternalIds: string[];
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
      // images/variants — the admin's "kept" lists only select which of the
      // REAL, server-verified images/variants to include.
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

      const images = fresh.images.filter((url) => draft.keptImageUrls.includes(url));
      const variants = fresh.variants.filter((v) => draft.keptVariantExternalIds.includes(v.externalId));

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
          storeId: store?.id,
          videoUrl: draft.includeVideo ? fresh.videoUrl : null,
          images: { create: images.slice(0, 8).map((url, i) => ({ url, sortOrder: i })) },
          variants: draft.importVariants
            ? { create: variants.map((v) => ({ name: v.name, sku: v.sku ?? undefined, attributes: v.attributes })) }
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

      result.succeeded.push({ draftId: draft.draftId, productId: product.id, name: product.name });
    } catch (e) {
      result.failed.push({ draftId: draft.draftId, name: draft.name || draft.externalId, error: e instanceof Error ? e.message : "Import failed" });
    }
  }

  if (result.succeeded.length > 0) revalidatePath("/admin/products");
  return result;
}
