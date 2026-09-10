"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
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
