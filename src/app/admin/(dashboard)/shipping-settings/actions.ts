"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { shippingGlobalSettingsSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateShippingGlobalSettingsAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const raw = Object.fromEntries(formData);
  const parsed = shippingGlobalSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/admin/shipping-settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid settings")}`);
  }
  const data = parsed.data!;

  const existing = await db.shippingGlobalSettings.findFirst();
  if (existing) {
    await db.shippingGlobalSettings.update({ where: { id: existing.id }, data });
  } else {
    await db.shippingGlobalSettings.create({ data });
  }

  await db.auditLog.create({
    data: { actorId: staff.id, action: "SHIPPING_GLOBAL_SETTINGS_UPDATED", entityType: "ShippingGlobalSettings", entityId: existing?.id ?? "new", summary: "Updated shipping engine global settings" },
  });

  revalidatePath("/admin/shipping-settings");
  redirect("/admin/shipping-settings?saved=1");
}
