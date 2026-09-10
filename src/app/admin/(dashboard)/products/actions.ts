"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { productSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createProductAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const raw = Object.fromEntries(formData);
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/admin/products?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid product")}`);
  }
  const data = parsed.data!;

  const product = await db.product.create({
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
      images: data.imageUrl ? { create: [{ url: data.imageUrl, sortOrder: 0 }] } : undefined,
    },
  });

  await db.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_CREATED", entityType: "Product", entityId: product.id, summary: `Created product "${product.name}"` },
  });

  revalidatePath("/admin/products");
  redirect("/admin/products?created=1");
}

export async function toggleProductActiveAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const productId = String(formData.get("productId"));
  const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
  await db.product.update({ where: { id: productId }, data: { isActive: !product.isActive } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "PRODUCT_TOGGLED", entityType: "Product", entityId: productId, summary: `${!product.isActive ? "Activated" : "Deactivated"} "${product.name}"` },
  });
  revalidatePath("/admin/products");
}

export async function deleteProductAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const productId = String(formData.get("productId"));

  try {
    await db.product.delete({ where: { id: productId } });
    await db.auditLog.create({
      data: { actorId: staff.id, action: "PRODUCT_DELETED", entityType: "Product", entityId: productId, summary: "Deleted product" },
    });
    revalidatePath("/admin/products");
  } catch {
    // Product has existing order/cart references — deactivate instead of a hard delete.
    await db.product.update({ where: { id: productId }, data: { isActive: false } });
    revalidatePath("/admin/products");
    redirect("/admin/products?error=" + encodeURIComponent("Product has order history — deactivated instead of deleted."));
  }
}
