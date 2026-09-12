"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { carrierSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createCarrierAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const parsed = carrierSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/carriers?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid carrier")}`);
  }
  const data = parsed.data!;

  const carrier = await db.carrier.create({
    data: { name: data.name, code: data.code, isLiveApiEnabled: data.isLiveApiEnabled },
  });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "CARRIER_CREATED", entityType: "Carrier", entityId: carrier.id, summary: `Added carrier "${carrier.name}"` },
  });

  revalidatePath("/admin/carriers");
  redirect("/admin/carriers?saved=1");
}

export async function toggleCarrierActiveAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const id = String(formData.get("carrierId"));
  const carrier = await db.carrier.findUniqueOrThrow({ where: { id } });
  await db.carrier.update({ where: { id }, data: { isActive: !carrier.isActive } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "CARRIER_TOGGLED", entityType: "Carrier", entityId: id, summary: `${!carrier.isActive ? "Activated" : "Deactivated"} "${carrier.name}"` },
  });
  revalidatePath("/admin/carriers");
}
