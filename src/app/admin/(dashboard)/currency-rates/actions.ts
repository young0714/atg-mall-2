"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { currencyRateSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function upsertCurrencyRateAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const parsed = currencyRateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/currency-rates?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid rate")}`);
  }
  const data = parsed.data!;

  await db.currencyRate.upsert({
    where: { fromCurrency_toCurrency: { fromCurrency: data.fromCurrency, toCurrency: data.toCurrency } },
    update: { rate: data.rate, source: "MANUAL", fetchedAt: new Date(), isActive: true },
    create: { fromCurrency: data.fromCurrency, toCurrency: data.toCurrency, rate: data.rate, source: "MANUAL" },
  });

  await db.auditLog.create({
    data: { actorId: staff.id, action: "CURRENCY_RATE_SAVED", entityType: "CurrencyRate", entityId: `${data.fromCurrency}_${data.toCurrency}`, summary: `Set ${data.fromCurrency} -> ${data.toCurrency} = ${data.rate}` },
  });

  revalidatePath("/admin/currency-rates");
  redirect("/admin/currency-rates?saved=1");
}

export async function toggleCurrencyRateActiveAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const id = String(formData.get("rateId"));
  const rate = await db.currencyRate.findUniqueOrThrow({ where: { id } });
  await db.currencyRate.update({ where: { id }, data: { isActive: !rate.isActive } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "CURRENCY_RATE_TOGGLED", entityType: "CurrencyRate", entityId: id, summary: `${!rate.isActive ? "Activated" : "Deactivated"} ${rate.fromCurrency} -> ${rate.toCurrency}` },
  });
  revalidatePath("/admin/currency-rates");
}
