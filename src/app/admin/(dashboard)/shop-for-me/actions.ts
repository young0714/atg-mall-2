"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { sumMinor } from "@/lib/money";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Currency } from "@prisma/client";

export async function issueShopForMeQuotationAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SHOP_FOR_ME);
  const requestId = String(formData.get("requestId"));
  const currency = String(formData.get("currency")) as Currency;

  const toMinor = (key: string) => Math.round(Number(formData.get(key) || 0) * 100);
  const productCostMinor = toMinor("productCost");
  const chinaShippingMinor = toMinor("chinaShipping");
  const serviceFeeMinor = toMinor("serviceFee");
  const intlShippingMinor = toMinor("intlShipping");
  const otherChargesMinor = toMinor("otherCharges");

  const totalMinor = sumMinor(productCostMinor, chinaShippingMinor, serviceFeeMinor, intlShippingMinor, otherChargesMinor);

  await db.quotation.create({
    data: {
      quotationNumber: `QT-${Date.now().toString(36).toUpperCase()}`,
      shopForMeRequestId: requestId,
      productCostMinor,
      chinaShippingMinor,
      serviceFeeMinor,
      intlShippingMinor,
      otherChargesMinor,
      totalMinor,
      currency,
      issuedById: staff.id,
      lineItems: {
        create: [
          { label: "Product cost", amountMinor: productCostMinor },
          { label: "China domestic shipping", amountMinor: chinaShippingMinor },
          { label: "ATG service fee", amountMinor: serviceFeeMinor },
          { label: "International shipping", amountMinor: intlShippingMinor },
          ...(otherChargesMinor > 0 ? [{ label: "Other charges", amountMinor: otherChargesMinor }] : []),
        ],
      },
    },
  });

  await db.shopForMeRequest.update({ where: { id: requestId }, data: { status: "QUOTED" } });

  revalidatePath("/admin/shop-for-me");
  redirect("/admin/shop-for-me?quoted=1");
}

export async function markShopForMeUnderReviewAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_SHOP_FOR_ME);
  const requestId = String(formData.get("requestId"));
  await db.shopForMeRequest.update({ where: { id: requestId }, data: { status: "UNDER_REVIEW" } });
  revalidatePath("/admin/shop-for-me");
}
