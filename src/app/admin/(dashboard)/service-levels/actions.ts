"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { shippingServiceLevelSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createServiceLevelAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const parsed = shippingServiceLevelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/service-levels?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid service level")}`);
  }
  const data = parsed.data!;

  const level = await db.shippingServiceLevel.create({ data: { name: data.name, sortOrder: data.sortOrder } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "SERVICE_LEVEL_CREATED", entityType: "ShippingServiceLevel", entityId: level.id, summary: `Added service level "${level.name}"` },
  });

  revalidatePath("/admin/service-levels");
  redirect("/admin/service-levels?saved=1");
}

export async function toggleServiceLevelActiveAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const id = String(formData.get("levelId"));
  const level = await db.shippingServiceLevel.findUniqueOrThrow({ where: { id } });
  await db.shippingServiceLevel.update({ where: { id }, data: { isActive: !level.isActive } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "SERVICE_LEVEL_TOGGLED", entityType: "ShippingServiceLevel", entityId: id, summary: `${!level.isActive ? "Activated" : "Deactivated"} "${level.name}"` },
  });
  revalidatePath("/admin/service-levels");
}
