"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { customsSettingSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function upsertCustomsSettingAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const parsed = customsSettingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/customs-settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid customs setting")}`);
  }
  const data = parsed.data!;

  await db.customsSetting.upsert({
    where: { destinationCountryId: data.destinationCountryId },
    update: {
      estimatedDutyPercent: data.estimatedDutyPercent ?? null,
      importTaxPercent: data.importTaxPercent ?? null,
      customsProcessingFeeMinor: data.customsProcessingFeeMinor ?? null,
      currency: data.currency || null,
      notes: data.notes || null,
      isConfigured: data.isConfigured,
    },
    create: {
      destinationCountryId: data.destinationCountryId,
      estimatedDutyPercent: data.estimatedDutyPercent ?? null,
      importTaxPercent: data.importTaxPercent ?? null,
      customsProcessingFeeMinor: data.customsProcessingFeeMinor ?? null,
      currency: data.currency || null,
      notes: data.notes || null,
      isConfigured: data.isConfigured,
    },
  });

  await db.auditLog.create({
    data: { actorId: staff.id, action: "CUSTOMS_SETTING_SAVED", entityType: "CustomsSetting", entityId: data.destinationCountryId, summary: "Saved customs disclosure setting" },
  });

  revalidatePath("/admin/customs-settings");
  redirect("/admin/customs-settings?saved=1");
}
