"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { destinationCountrySchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createDestinationCountryAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const parsed = destinationCountrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/destination-countries?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid country")}`);
  }
  const data = parsed.data!;

  const country = await db.destinationCountry.create({
    data: { name: data.name, isoCode: data.isoCode, region: data.region || null },
  });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "DESTINATION_COUNTRY_CREATED", entityType: "DestinationCountry", entityId: country.id, summary: `Added destination country "${country.name}"` },
  });

  revalidatePath("/admin/destination-countries");
  redirect("/admin/destination-countries?saved=1");
}

export async function toggleDestinationCountryActiveAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const id = String(formData.get("countryId"));
  const country = await db.destinationCountry.findUniqueOrThrow({ where: { id } });
  await db.destinationCountry.update({ where: { id }, data: { isActive: !country.isActive } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "DESTINATION_COUNTRY_TOGGLED", entityType: "DestinationCountry", entityId: id, summary: `${!country.isActive ? "Activated" : "Deactivated"} "${country.name}"` },
  });
  revalidatePath("/admin/destination-countries");
}
