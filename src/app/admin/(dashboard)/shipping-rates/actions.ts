"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { shippingRateSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function upsertShippingRateAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const parsed = shippingRateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/shipping-rates?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid rate")}`);
  }
  const data = parsed.data!;

  await db.shippingRate.upsert({
    where: {
      originCountry_destinationCountry_method: {
        originCountry: data.originCountry,
        destinationCountry: data.destinationCountry,
        method: data.method,
      },
    },
    update: {
      pricePerKgMinor: data.pricePerKgMinor,
      currency: data.currency,
      minChargeableWeightGrams: data.minChargeableWeightGrams,
      estimatedDaysMin: data.estimatedDaysMin,
      estimatedDaysMax: data.estimatedDaysMax,
      notes: data.notes,
      isActive: true,
    },
    create: { ...data },
  });

  revalidatePath("/admin/shipping-rates");
  redirect("/admin/shipping-rates?saved=1");
}

export async function toggleShippingRateActiveAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const id = String(formData.get("rateId"));
  const rate = await db.shippingRate.findUniqueOrThrow({ where: { id } });
  await db.shippingRate.update({ where: { id }, data: { isActive: !rate.isActive } });
  revalidatePath("/admin/shipping-rates");
}
