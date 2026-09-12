"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { shippingOriginSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createShippingOriginAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const parsed = shippingOriginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/shipping-origins?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid origin")}`);
  }
  const data = parsed.data!;

  const origin = await db.shippingOrigin.create({
    data: { name: data.name, countryIso: data.countryIso, city: data.city || null },
  });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "SHIPPING_ORIGIN_CREATED", entityType: "ShippingOrigin", entityId: origin.id, summary: `Created shipping origin "${origin.name}"` },
  });

  revalidatePath("/admin/shipping-origins");
  redirect("/admin/shipping-origins?saved=1");
}

export async function toggleShippingOriginActiveAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const id = String(formData.get("originId"));
  const origin = await db.shippingOrigin.findUniqueOrThrow({ where: { id } });
  await db.shippingOrigin.update({ where: { id }, data: { isActive: !origin.isActive } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "SHIPPING_ORIGIN_TOGGLED", entityType: "ShippingOrigin", entityId: id, summary: `${!origin.isActive ? "Activated" : "Deactivated"} "${origin.name}"` },
  });
  revalidatePath("/admin/shipping-origins");
}
