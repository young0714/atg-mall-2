"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { storeSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function parseStoreForm(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const supportedDestinations = formData.getAll("supportedDestinations");
  return storeSchema.safeParse({ ...raw, supportedDestinations });
}

export async function createStoreAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_STORES);
  const parsed = parseStoreForm(formData);
  if (!parsed.success) {
    redirect(`/admin/international-stores?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid store")}`);
  }
  const data = parsed.data!;

  const store = await db.store.create({
    data: {
      name: data.name,
      slug: data.slug,
      country: data.country,
      logoUrl: data.logoUrl || null,
      websiteUrl: data.websiteUrl || null,
      internalBrowsePath: data.internalBrowsePath || null,
      description: data.description || null,
      integrationType: data.integrationType,
      affiliateUrl: data.affiliateUrl || null,
      apiStatus: data.apiStatus || null,
      isActive: data.isActive,
      shopForMeEnabled: data.shopForMeEnabled,
      supportedDestinations: data.supportedDestinations,
      sortOrder: data.sortOrder,
    },
  });

  await db.auditLog.create({
    data: { actorId: staff.id, action: "STORE_CREATED", entityType: "Store", entityId: store.id, summary: `Created store "${store.name}" (${store.country})` },
  });

  revalidatePath("/admin/international-stores");
  redirect("/admin/international-stores?created=1");
}

export async function updateStoreAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_STORES);
  const storeId = String(formData.get("storeId"));
  const parsed = parseStoreForm(formData);
  if (!parsed.success) {
    redirect(`/admin/international-stores/${storeId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid store")}`);
  }
  const data = parsed.data!;

  const store = await db.store.update({
    where: { id: storeId },
    data: {
      name: data.name,
      slug: data.slug,
      country: data.country,
      logoUrl: data.logoUrl || null,
      websiteUrl: data.websiteUrl || null,
      internalBrowsePath: data.internalBrowsePath || null,
      description: data.description || null,
      integrationType: data.integrationType,
      affiliateUrl: data.affiliateUrl || null,
      apiStatus: data.apiStatus || null,
      isActive: data.isActive,
      shopForMeEnabled: data.shopForMeEnabled,
      supportedDestinations: data.supportedDestinations,
      sortOrder: data.sortOrder,
    },
  });

  await db.auditLog.create({
    data: { actorId: staff.id, action: "STORE_UPDATED", entityType: "Store", entityId: store.id, summary: `Updated store "${store.name}"` },
  });

  revalidatePath(`/admin/international-stores/${storeId}`);
  revalidatePath("/admin/international-stores");
  redirect(`/admin/international-stores/${storeId}?updated=1`);
}

export async function toggleStoreActiveAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_STORES);
  const storeId = String(formData.get("storeId"));
  const store = await db.store.findUniqueOrThrow({ where: { id: storeId } });
  await db.store.update({ where: { id: storeId }, data: { isActive: !store.isActive } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "STORE_TOGGLED", entityType: "Store", entityId: storeId, summary: `${!store.isActive ? "Activated" : "Deactivated"} "${store.name}"` },
  });
  revalidatePath("/admin/international-stores");
}

export async function deleteStoreAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_STORES);
  const storeId = String(formData.get("storeId"));

  try {
    await db.store.delete({ where: { id: storeId } });
    await db.auditLog.create({
      data: { actorId: staff.id, action: "STORE_DELETED", entityType: "Store", entityId: storeId, summary: "Deleted store" },
    });
    revalidatePath("/admin/international-stores");
  } catch {
    // Store has products or requests referencing it — deactivate instead of a hard delete.
    await db.store.update({ where: { id: storeId }, data: { isActive: false } });
    revalidatePath("/admin/international-stores");
    redirect("/admin/international-stores?error=" + encodeURIComponent("Store has products/requests linked to it — deactivated instead of deleted."));
  }
}
