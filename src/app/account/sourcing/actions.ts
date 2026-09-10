"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sumMinor } from "@/lib/money";

/**
 * Approving a sourcing option is the customer's acceptance of that supplier
 * quote. To avoid an extra manual admin round-trip in the MVP, approving an
 * option immediately generates the formal Quotation from that option's
 * figures — the customer then confirms payment on /account/quotations,
 * which is the actual money-moving step.
 */
export async function approveSourcingOptionAction(formData: FormData) {
  const user = await requireUser();
  const optionId = String(formData.get("optionId"));

  const option = await db.sourcingOption.findFirst({
    where: { id: optionId, sourcingRequest: { userId: user.id } },
    include: { sourcingRequest: true },
  });
  if (!option) redirect("/account/sourcing?error=Option+not+found");

  await db.sourcingOption.updateMany({
    where: { sourcingRequestId: option!.sourcingRequestId },
    data: { isSelected: false },
  });
  await db.sourcingOption.update({ where: { id: option!.id }, data: { isSelected: true } });

  const totalMinor = sumMinor(option!.unitPriceMinor, option!.estimatedShippingMinor, option!.sourcingFeeMinor);

  const quotation = await db.quotation.create({
    data: {
      quotationNumber: `QT-${Date.now().toString(36).toUpperCase()}`,
      sourcingRequestId: option!.sourcingRequestId,
      productCostMinor: option!.unitPriceMinor,
      chinaShippingMinor: 0,
      serviceFeeMinor: option!.sourcingFeeMinor,
      intlShippingMinor: option!.estimatedShippingMinor,
      totalMinor,
      currency: option!.currency,
      issuedById: option!.addedById ?? user.id,
      lineItems: {
        create: [
          { label: "Product cost", amountMinor: option!.unitPriceMinor },
          { label: "Estimated international shipping", amountMinor: option!.estimatedShippingMinor },
          { label: "ATG sourcing fee", amountMinor: option!.sourcingFeeMinor },
        ],
      },
    },
  });

  await db.sourcingRequest.update({ where: { id: option!.sourcingRequestId }, data: { status: "QUOTED" } });

  revalidatePath("/account/sourcing");
  revalidatePath("/account/quotations");
  redirect(`/account/quotations?ready=${quotation.id}`);
}
