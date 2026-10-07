"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Dates are whole days in UTC (Gambia time): the sale runs from 00:00 on the first day to the last moment of the last day.
export async function saveSaleAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const fail = (m: string): never => redirect(`/admin/sale?error=${encodeURIComponent(m)}`);

  const percentOff = Number(formData.get("percentOff"));
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 90) fail("Percent off must be a whole number from 1 to 90.");

  const from = String(formData.get("startsAt") ?? "");
  const to = String(formData.get("endsAt") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) fail("Choose both a start date and an end date.");
  const startsAt = new Date(`${from}T00:00:00.000Z`);
  const endsAt = new Date(`${to}T23:59:59.999Z`);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) fail("Those dates aren't valid.");
  if (endsAt < startsAt) fail("The end date must be on or after the start date.");

  const data = {
    percentOff,
    startsAt,
    endsAt,
    isActive: formData.get("isActive") === "true",
    headline: String(formData.get("headline") ?? "").trim().slice(0, 80) || null,
    showCountdown: formData.get("showCountdown") === "true",
  };

  const existing = await db.siteSale.findFirst({ orderBy: { updatedAt: "desc" } });
  const sale = existing ? await db.siteSale.update({ where: { id: existing.id }, data }) : await db.siteSale.create({ data });
  await db.auditLog.create({
    data: {
      actorId: staff.id,
      action: "SITE_SALE_SAVED",
      entityType: "SiteSale",
      entityId: sale.id,
      summary: `${sale.isActive ? "Saved (on)" : "Saved (off)"} site sale: ${sale.percentOff}% off, ${from} to ${to}`,
    },
  });

  // Prices appear on every page, so refresh them all.
  revalidatePath("/", "layout");
  redirect("/admin/sale?saved=1");
}
