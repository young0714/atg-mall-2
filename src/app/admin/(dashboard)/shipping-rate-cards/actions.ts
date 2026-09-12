"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { shippingRateCardSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { findDuplicateRateCard, toCardWriteData } from "./helpers";

export async function createRateCardAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const parsed = shippingRateCardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/shipping-rate-cards?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid rate card")}`);
  }
  const data = parsed.data!;

  const duplicate = await findDuplicateRateCard(data);
  if (duplicate) {
    redirect(`/admin/shipping-rate-cards?error=${encodeURIComponent("A rate card already exists for this origin, destination, region, and service level. Edit it instead of creating a duplicate.")}`);
  }

  const card = await db.shippingRateCard.create({ data: toCardWriteData(data) });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "RATE_CARD_CREATED", entityType: "ShippingRateCard", entityId: card.id, summary: "Created a shipping rate card" },
  });

  revalidatePath("/admin/shipping-rate-cards");
  redirect(`/admin/shipping-rate-cards/${card.id}?saved=1`);
}

export async function toggleRateCardActiveAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const id = String(formData.get("cardId"));
  const card = await db.shippingRateCard.findUniqueOrThrow({ where: { id } });
  await db.shippingRateCard.update({ where: { id }, data: { isActive: !card.isActive } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "RATE_CARD_TOGGLED", entityType: "ShippingRateCard", entityId: id, summary: `${!card.isActive ? "Activated" : "Deactivated"} rate card` },
  });
  revalidatePath("/admin/shipping-rate-cards");
}
