"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { cjDropshippingService } from "@/lib/services/cjDropshippingService";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function importCjProductAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const pid = String(formData.get("pid"));
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const categoryId = String(formData.get("categoryId") || "");
  const description = String(formData.get("description") || "").trim();
  const basePriceMinor = Number(formData.get("basePriceMinor"));
  const weightGrams = Number(formData.get("weightGrams"));
  const importVariants = formData.get("importVariants") === "true";

  if (!name || !slug || !categoryId || !description || !Number.isFinite(basePriceMinor) || !Number.isFinite(weightGrams)) {
    redirect(`/admin/cj-import/${pid}?error=${encodeURIComponent("Fill in every required field")}`);
  }

  const cjProduct = await cjDropshippingService.getById(pid);
  if (!cjProduct) {
    redirect(`/admin/cj-import?error=${encodeURIComponent("CJ product not found — it may have been removed")}`);
  }

  const store = await db.store.findUnique({ where: { slug: "cjdropshipping" } });

  const product = await db.product.create({
    data: {
      name,
      slug,
      description,
      categoryId,
      basePriceMinor,
      baseCurrency: "USD",
      weightGrams,
      sourcePlatform: "CJDROPSHIPPING",
      sourceUrl: cjProduct!.sourceUrl,
      sourceProductId: cjProduct!.pid,
      storeId: store?.id,
      images: {
        create: cjProduct!.images.slice(0, 8).map((url, i) => ({ url, sortOrder: i })),
      },
      variants: importVariants
        ? {
            create: cjProduct!.variants.map((v) => ({
              name: v.name,
              sku: v.sku,
              priceDeltaMinor: v.priceMinorUsd - basePriceMinor,
              attributes: v.attributes,
            })),
          }
        : undefined,
    },
  });

  // Best-effort: register this product in CJ's own "My Products" list too,
  // purely so it's visible in the CJ dashboard for the admin's own tracking.
  // Never blocks the ATG import itself if it fails.
  const addedToCjMyProducts = await cjDropshippingService.addToMyProduct(pid);

  await db.auditLog.create({
    data: {
      actorId: staff.id,
      action: "PRODUCT_IMPORTED_FROM_CJ",
      entityType: "Product",
      entityId: product.id,
      summary: `Imported "${product.name}" from CJdropshipping (pid ${pid})${addedToCjMyProducts ? " and added to CJ My Products" : " (could not register in CJ My Products)"}`,
    },
  });

  revalidatePath("/admin/products");
  redirect(`/admin/products/${product.id}?updated=1`);
}
