"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function bulkUpdateCarrierRatesAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const carrierId = String(formData.get("carrierId"));

  const currency = String(formData.get("currency") || "").trim().toUpperCase();
  const basePriceMinor = Number(formData.get("basePriceMinor"));
  const pricePerKgMinor = Number(formData.get("pricePerKgMinor"));
  const minChargeMinor = Number(formData.get("minChargeMinor"));
  const deliveryDaysMin = Number(formData.get("deliveryDaysMin"));
  const deliveryDaysMax = Number(formData.get("deliveryDaysMax"));

  if (
    currency.length !== 3 ||
    !Number.isFinite(basePriceMinor) ||
    !Number.isFinite(pricePerKgMinor) ||
    !Number.isFinite(minChargeMinor) ||
    !Number.isFinite(deliveryDaysMin) ||
    !Number.isFinite(deliveryDaysMax)
  ) {
    redirect(`/admin/carriers/${carrierId}/rates?error=${encodeURIComponent("Fill in every field with a valid number (currency must be a 3-letter code)")}`);
  }
  if (deliveryDaysMax < deliveryDaysMin) {
    redirect(`/admin/carriers/${carrierId}/rates?error=${encodeURIComponent("Max delivery days must be at least the min")}`);
  }

  const cards = await db.shippingRateCard.findMany({ where: { carrierId }, select: { id: true } });
  const cardIds = cards.map((c) => c.id);

  await db.shippingRateCard.updateMany({
    where: { carrierId },
    data: { deliveryDaysMin, deliveryDaysMax, currency },
  });

  // Every rate card for this carrier gets its bracket(s) set to the same
  // flat base + per-kg + minimum — this is a bulk "one rate for the whole
  // carrier" update, not per-lane tiering. Lanes that need to differ from
  // the rest can still be edited individually from their own rate card page.
  await db.shippingRateBracket.updateMany({
    where: { rateCardId: { in: cardIds } },
    data: { basePriceMinor, pricePerKgMinor, minChargeMinor },
  });

  await db.auditLog.create({
    data: {
      actorId: staff.id,
      action: "RATE_CARD_UPDATED",
      entityType: "Carrier",
      entityId: carrierId,
      summary: `Bulk-updated rates across ${cardIds.length} lane(s) for this carrier`,
    },
  });

  revalidatePath(`/admin/carriers/${carrierId}/rates`);
  revalidatePath("/admin/shipping-rate-cards");
  redirect(`/admin/carriers/${carrierId}/rates?saved=1`);
}
