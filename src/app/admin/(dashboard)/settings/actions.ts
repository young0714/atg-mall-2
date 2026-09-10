"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { deliveryZoneSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function upsertDeliveryZoneAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SETTINGS);
  const parsed = deliveryZoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid zone")}`);
  }
  const data = parsed.data!;

  if (data.etaDaysMax < data.etaDaysMin) {
    redirect("/admin/settings?error=Max+ETA+days+cannot+be+less+than+min");
  }

  await db.deliveryZone.upsert({
    where: { country_city: { country: data.country, city: data.city } },
    update: {
      currency: data.currency,
      localFeeMinor: data.localFeeMinor,
      etaDaysMin: data.etaDaysMin,
      etaDaysMax: data.etaDaysMax,
      isActive: true,
    },
    create: { ...data },
  });

  await db.auditLog.create({
    data: {
      actorId: staff.id,
      action: "DELIVERY_ZONE_SAVED",
      entityType: "DeliveryZone",
      entityId: `${data.country}:${data.city}`,
      summary: `Delivery zone ${data.city}, ${data.country} saved`,
    },
  });

  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export async function toggleDeliveryZoneActiveAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_SETTINGS);
  const id = String(formData.get("zoneId"));
  const zone = await db.deliveryZone.findUniqueOrThrow({ where: { id } });
  await db.deliveryZone.update({ where: { id }, data: { isActive: !zone.isActive } });
  revalidatePath("/admin/settings");
}

export async function deleteDeliveryZoneAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_SETTINGS);
  const id = String(formData.get("zoneId"));
  await db.deliveryZone.delete({ where: { id } });
  revalidatePath("/admin/settings");
}
