"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { productSchema, productImageSchema, productVariantSchema } from "@/lib/validation/schemas";
import { saveUploadedFile, saveUploadedVideo } from "@/lib/storage";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
      isHeroEligible: data.isHeroEligible,
      sourcePlatform: data.sourcePlatform,
      affiliateUrl: data.affiliateUrl || null,
      affiliateProvider: data.affiliateProvider || null,
      shippingOriginId: data.shippingOriginId || null,
      packageLengthCm: data.packageLengthCm ?? null,
      packageWidthCm: data.packageWidthCm ?? null,
      packageHeightCm: data.packageHeightCm ?? null,
      shippingCategory: data.shippingCategory || null,
      internationalShippingAllowed: data.internationalShippingAllowed,
      customsRequired: data.customsRequired,
      isFragile: data.isFragile,
      isHazardous: data.isHazardous,
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

  let uploadedUrl: string | null = null;
  const file = formData.get("imageFile");
  if (file instanceof File && file.size > 0) {
    try {
      uploadedUrl = await saveUploadedFile(file, "products");
    } catch (err) {
      redirect(`/admin/products/${productId}?error=${encodeURIComponent((err as Error).message)}`);
    }
  }

  const raw = Object.fromEntries(formData);
  const parsed = productImageSchema
    .extend({ url: productImageSchema.shape.url.optional().or(z.literal("")) })
    .safeParse(raw);
  if (!parsed.success) {
    redirect(`/admin/products/${productId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid image")}`);
  }
  const data = parsed.data!;
  const url = uploadedUrl ?? data.url;
  if (!url) {
    redirect(`/admin/products/${productId}?error=${encodeURIComponent("Upload a file or provide an image URL")}`);
  }

  await db.productImage.create({
    data: { productId, url: url!, altText: data.altText || null, sortOrder: data.sortOrder },
  });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_IMAGE_ADDED", entityType: "Product", entityId: productId, summary: "Added product image" },
  });

  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?updated=1`);
}

export async function updateProductVideoAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const productId = String(formData.get("productId"));
  const urlInput = String(formData.get("videoUrl") || "").trim();

  let videoUrl: string | null = null;
  try {
    const file = formData.get("videoFile");
    if (file instanceof File && file.size > 0) {
      videoUrl = await saveUploadedVideo(file, "products");
    } else if (urlInput) {
      videoUrl = urlInput;
    }
  } catch (err) {
    redirect(`/admin/products/${productId}?error=${encodeURIComponent((err as Error).message)}`);
  }

  if (!videoUrl) {
    redirect(`/admin/products/${productId}?error=${encodeURIComponent("Upload a file or provide a video URL")}`);
  }

  await db.product.update({ where: { id: productId }, data: { videoUrl } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_VIDEO_UPDATED", entityType: "Product", entityId: productId, summary: "Set product video" },
  });

  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}?updated=1`);
}

export async function removeProductVideoAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const productId = String(formData.get("productId"));

  await db.product.update({ where: { id: productId }, data: { videoUrl: null } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_VIDEO_UPDATED", entityType: "Product", entityId: productId, summary: "Removed product video" },
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
  const product = await db.product.findUniqueOrThrow({ where: { id: productId }, select: { basePriceMinor: true } });

  // The form takes an absolute price (matching what the admin sees
  // everywhere else), not a raw delta — priceDeltaMinor is an internal
  // storage detail, computed here rather than asked of the admin directly.
  const priceMinor = Number(formData.get("price"));
  const raw = { ...Object.fromEntries(formData), priceDeltaMinor: Number.isFinite(priceMinor) ? priceMinor - product.basePriceMinor : 0 };
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

export async function updateVariantPriceAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const productId = String(formData.get("productId"));
  const variantId = String(formData.get("variantId"));
  const priceMinor = Number(formData.get("price"));
  if (!Number.isFinite(priceMinor)) {
    redirect(`/admin/products/${productId}?error=${encodeURIComponent("Enter a valid price")}`);
  }

  const product = await db.product.findUniqueOrThrow({ where: { id: productId }, select: { basePriceMinor: true } });
  const variant = await db.productVariant.update({
    where: { id: variantId, productId },
    data: { priceDeltaMinor: priceMinor - product.basePriceMinor },
  });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_VARIANT_PRICE_UPDATED", entityType: "Product", entityId: productId, summary: `Set "${variant.name}" price` },
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

export async function deleteProductVariantsAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const productId = String(formData.get("productId"));
  const variantIds = formData.getAll("variantIds").map(String);

  if (variantIds.length === 0) {
    redirect(`/admin/products/${productId}`);
  }

  let deletedCount = 0;
  let skippedCount = 0;
  for (const variantId of variantIds) {
    try {
      await db.productVariant.delete({ where: { id: variantId, productId } });
      deletedCount++;
    } catch {
      // Has existing order history (FK constraint) — skip it, keep going
      // with the rest of the batch rather than failing the whole selection.
      skippedCount++;
    }
  }

  await db.auditLog.create({
    data: {
      actorId: staff.id,
      action: "PRODUCT_VARIANT_DELETED",
      entityType: "Product",
      entityId: productId,
      summary: `Removed ${deletedCount} variant(s) in bulk${skippedCount > 0 ? ` (${skippedCount} skipped — existing order history)` : ""}`,
    },
  });

  revalidatePath(`/admin/products/${productId}`);
  const suffix =
    skippedCount > 0
      ? `&error=${encodeURIComponent(`Deleted ${deletedCount}, skipped ${skippedCount} (existing order history).`)}`
      : "";
  redirect(`/admin/products/${productId}?updated=1${suffix}`);
}
