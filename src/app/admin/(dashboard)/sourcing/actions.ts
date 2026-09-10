"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { sumMinor } from "@/lib/money";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Currency } from "@prisma/client";

export async function addSourcingOptionAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SOURCING);
  const requestId = String(formData.get("requestId"));
  const supplierId = String(formData.get("supplierId") || "") || undefined;
  const currency = String(formData.get("currency")) as Currency;

  const toMinor = (key: string) => Math.round(Number(formData.get(key) || 0) * 100);

  await db.sourcingOption.create({
    data: {
      sourcingRequestId: requestId,
      supplierId,
      unitPriceMinor: toMinor("unitPrice"),
      currency,
      moq: Number(formData.get("moq") || 1),
      estimatedShippingMinor: toMinor("estimatedShipping"),
      sourcingFeeMinor: toMinor("sourcingFee"),
      leadTimeDays: Number(formData.get("leadTimeDays") || 14),
      notes: String(formData.get("notes") || "") || undefined,
      addedById: staff.id,
    },
  });

  await db.sourcingRequest.update({ where: { id: requestId }, data: { status: "UNDER_REVIEW" } });

  revalidatePath("/admin/sourcing");
  redirect("/admin/sourcing?added=1");
}

export async function issueSourcingQuotationAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SOURCING);
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
      sourcingRequestId: requestId,
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
          { label: "Product/supplier cost", amountMinor: productCostMinor },
          { label: "China/local shipping", amountMinor: chinaShippingMinor },
          { label: "ATG sourcing fee", amountMinor: serviceFeeMinor },
          { label: "International shipping", amountMinor: intlShippingMinor },
          ...(otherChargesMinor > 0 ? [{ label: "Other charges", amountMinor: otherChargesMinor }] : []),
        ],
      },
    },
  });

  await db.sourcingRequest.update({ where: { id: requestId }, data: { status: "QUOTED" } });

  revalidatePath("/admin/sourcing");
  redirect("/admin/sourcing?quoted=1");
}
