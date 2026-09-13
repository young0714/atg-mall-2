"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { shippingRateCardSchema, shippingRateBracketSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { findDuplicateRateCard, toCardWriteData } from "../helpers";

export async function updateRateCardAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const cardId = String(formData.get("cardId"));
  const parsed = shippingRateCardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/shipping-rate-cards/${cardId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid rate card")}`);
  }
  const data = parsed.data!;

  const duplicate = await findDuplicateRateCard(data, cardId);
  if (duplicate) {
    redirect(`/admin/shipping-rate-cards/${cardId}?error=${encodeURIComponent("Another rate card already covers this origin, destination, region, and service level.")}`);
  }

  await db.shippingRateCard.update({ where: { id: cardId }, data: toCardWriteData(data) });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "RATE_CARD_UPDATED", entityType: "ShippingRateCard", entityId: cardId, summary: "Updated a shipping rate card" },
  });

  revalidatePath(`/admin/shipping-rate-cards/${cardId}`);
  revalidatePath("/admin/shipping-rate-cards");
  redirect(`/admin/shipping-rate-cards/${cardId}?saved=1`);
}

export async function addRateBracketAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const cardId = String(formData.get("cardId"));
  const parsed = shippingRateBracketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/shipping-rate-cards/${cardId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid bracket")}`);
  }
  const data = parsed.data!;
  if (data.maxGrams !== undefined && data.maxGrams <= data.minGrams) {
    redirect(`/admin/shipping-rate-cards/${cardId}?error=${encodeURIComponent("Max weight must be greater than min weight.")}`);
  }

  await db.shippingRateBracket.create({
    data: {
      rateCardId: cardId,
      minGrams: data.minGrams,
      maxGrams: data.maxGrams ?? null,
      basePriceMinor: data.basePriceMinor,
      pricePerKgMinor: data.pricePerKgMinor,
      minChargeMinor: data.minChargeMinor,
    },
  });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "RATE_BRACKET_ADDED", entityType: "ShippingRateCard", entityId: cardId, summary: `Added a weight bracket (${data.minGrams}g–${data.maxGrams ?? "∞"}g)` },
  });

  revalidatePath(`/admin/shipping-rate-cards/${cardId}`);
  redirect(`/admin/shipping-rate-cards/${cardId}?saved=1`);
}

export async function updateRateBracketAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const cardId = String(formData.get("cardId"));
  const bracketId = String(formData.get("bracketId"));
  const parsed = shippingRateBracketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/shipping-rate-cards/${cardId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid bracket")}`);
  }
  const data = parsed.data!;
  if (data.maxGrams !== undefined && data.maxGrams <= data.minGrams) {
    redirect(`/admin/shipping-rate-cards/${cardId}?error=${encodeURIComponent("Max weight must be greater than min weight.")}`);
  }

  await db.shippingRateBracket.update({
    where: { id: bracketId },
    data: {
      minGrams: data.minGrams,
      maxGrams: data.maxGrams ?? null,
      basePriceMinor: data.basePriceMinor,
      pricePerKgMinor: data.pricePerKgMinor,
      minChargeMinor: data.minChargeMinor,
    },
  });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "RATE_BRACKET_UPDATED", entityType: "ShippingRateCard", entityId: cardId, summary: "Updated a weight bracket's pricing" },
  });

  revalidatePath(`/admin/shipping-rate-cards/${cardId}`);
  redirect(`/admin/shipping-rate-cards/${cardId}?saved=1`);
}

export async function deleteRateBracketAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const cardId = String(formData.get("cardId"));
  const bracketId = String(formData.get("bracketId"));

  await db.shippingRateBracket.delete({ where: { id: bracketId } });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "RATE_BRACKET_DELETED", entityType: "ShippingRateCard", entityId: cardId, summary: "Removed a weight bracket" },
  });

  revalidatePath(`/admin/shipping-rate-cards/${cardId}`);
  redirect(`/admin/shipping-rate-cards/${cardId}?saved=1`);
}
