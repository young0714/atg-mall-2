"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { productSchema, productImageSchema, productVariantSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateProductAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const productId = String(formData.get("productId"));
  const raw = Object.fromEntries(formData);
  const parsed = productSchema.omit({ imageUrl: true }).safeParse(raw);
  if (!parsed.success) {
    redirect(`/admin/products/${productId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid product")}`);
  }
  const data = parsed.data!;

  const product = await db.product.update({
    where: { id: productId },
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      categoryId: data.categoryId,
      basePriceMinor: data.basePriceMinor,
      baseCurrency: data.baseCurrency,
      moq: data.moq,
      weightGrams: data.weightGrams,
      isWholesale: data.isWholesale,
      isFeatured: data.isFeatured,
      sourcePlatform: data.sourcePlatform,
      affiliateUrl: data.affiliateUrl || null,
      affiliateProvider: data.affiliateProvider || null,
    },
  });

  await db.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_UPDATED", entityType: "Product", entityId: product.id, summary: `Updated product "${product.name}"` },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  redirect(`/admin/products/${productId}?updated=1`);
}

export async function addProductImageAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const productId = String(formData.get("productId"));
  const raw = Object.fromEntries(formData);
  const parsed = productImageSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/admin/products/${productId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid image")}`);
  }
  const data = parsed.data!;

  await db.productImage.create({
    data: { productId, url: data.url, altText: data.altText || null, sortOrder: data.sortOrder },
  });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_IMAGE_ADDED", entityType: "Product", entityId: productId, summary: "Added product image" },
  });

  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?updated=1`);
}

export async function deleteProductImageAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const productId = String(formData.get("productId"));
  const imageId = String(formData.get("imageId"));

  await db.productImage.delete({ where: { id: imageId } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_IMAGE_DELETED", entityType: "Product", entityId: productId, summary: "Removed product image" },
  });

  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?updated=1`);
}

export async function addProductVariantAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const productId = String(formData.get("productId"));
  const raw = Object.fromEntries(formData);
  const parsed = productVariantSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/admin/products/${productId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid variant")}`);
  }
  const data = parsed.data!;

  await db.productVariant.create({
    data: {
      productId,
      name: data.name,
      sku: data.sku || null,
      priceDeltaMinor: data.priceDeltaMinor,
      stock: data.stock,
      attributes: data.attributes,
    },
  });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_VARIANT_ADDED", entityType: "Product", entityId: productId, summary: `Added variant "${data.name}"` },
  });

  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?updated=1`);
}

export async function deleteProductVariantAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const productId = String(formData.get("productId"));
  const variantId = String(formData.get("variantId"));

  try {
    await db.productVariant.delete({ where: { id: variantId } });
    await db.auditLog.create({
      data: { actorId: staff.id, action: "PRODUCT_VARIANT_DELETED", entityType: "Product", entityId: productId, summary: "Removed product variant" },
    });
    revalidatePath(`/admin/products/${productId}`);
  } catch {
    redirect(`/admin/products/${productId}?error=${encodeURIComponent("Variant has existing order history — cannot delete.")}`);
  }
  redirect(`/admin/products/${productId}?updated=1`);
}
