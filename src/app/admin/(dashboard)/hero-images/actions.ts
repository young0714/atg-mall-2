"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { saveUploadedFile } from "@/lib/storage";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createHeroImageAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const imageFile = formData.get("imageFile");
  if (!(imageFile instanceof File) || imageFile.size === 0) {
    redirect("/admin/hero-images?error=" + encodeURIComponent("Choose an image to upload"));
  }

  let imageUrl: string | null;
  try {
    imageUrl = await saveUploadedFile(imageFile, "hero-images");
  } catch (err) {
    redirect("/admin/hero-images?error=" + encodeURIComponent((err as Error).message));
  }
  if (!imageUrl) {
    redirect("/admin/hero-images?error=" + encodeURIComponent("Upload failed"));
  }

  const heroImage = await db.heroImage.create({ data: { imageUrl } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "HERO_IMAGE_CREATED", entityType: "HeroImage", entityId: heroImage.id, summary: "Added a homepage hero photo" },
  });

  revalidatePath("/admin/hero-images");
  revalidatePath("/");
  redirect("/admin/hero-images?created=1");
}

export async function toggleHeroImageActiveAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const id = String(formData.get("heroImageId"));

  const heroImage = await db.heroImage.findUnique({ where: { id } });
  if (!heroImage) redirect("/admin/hero-images?error=" + encodeURIComponent("Photo not found"));

  await db.heroImage.update({ where: { id }, data: { isActive: !heroImage!.isActive } });
  await db.auditLog.create({
    data: {
      actorId: staff.id,
      action: heroImage!.isActive ? "HERO_IMAGE_DEACTIVATED" : "HERO_IMAGE_ACTIVATED",
      entityType: "HeroImage",
      entityId: id,
      summary: heroImage!.isActive ? "Hid a homepage hero photo" : "Showed a homepage hero photo",
    },
  });

  revalidatePath("/admin/hero-images");
  revalidatePath("/");
}

export async function deleteHeroImageAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const id = String(formData.get("heroImageId"));

  await db.heroImage.delete({ where: { id } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "HERO_IMAGE_DELETED", entityType: "HeroImage", entityId: id, summary: "Removed a homepage hero photo" },
  });

  revalidatePath("/admin/hero-images");
  revalidatePath("/");
}

export async function updateHeroSettingsAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const seconds = Number(formData.get("slideDurationSeconds"));
  if (!Number.isInteger(seconds) || seconds < 2 || seconds > 30) {
    redirect("/admin/hero-images?error=" + encodeURIComponent("Slide duration must be a whole number of seconds, between 2 and 30"));
  }

  const existing = await db.heroSettings.findFirst();
  if (existing) {
    await db.heroSettings.update({ where: { id: existing.id }, data: { slideDurationSeconds: seconds } });
  } else {
    await db.heroSettings.create({ data: { slideDurationSeconds: seconds } });
  }
  await db.auditLog.create({
    data: {
      actorId: staff.id,
      action: "HERO_SETTINGS_UPDATED",
      entityType: "HeroSettings",
      entityId: existing?.id ?? "new",
      summary: `Set hero slide duration to ${seconds}s`,
    },
  });

  revalidatePath("/admin/hero-images");
  revalidatePath("/");
  redirect("/admin/hero-images?saved=1");
}
