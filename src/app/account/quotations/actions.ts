"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { orderService } from "@/lib/services/orderService";
import { redirect } from "next/navigation";

export async function acceptQuotationAction(formData: FormData) {
  const user = await requireUser();
  const quotationId = String(formData.get("quotationId"));

  const quotation = await db.quotation.findFirst({
    where: {
      id: quotationId,
      OR: [{ shopForMeRequest: { userId: user.id } }, { sourcingRequest: { userId: user.id } }],
      status: "PENDING",
    },
    include: { shopForMeRequest: true, sourcingRequest: true },
  });
  if (!quotation) redirect("/account/quotations?error=Quotation+not+found+or+already+processed");

  const destination = quotation!.shopForMeRequest?.destination ?? quotation!.sourcingRequest?.destination ?? "NIGERIA";
  const address = await db.address.findFirst({ where: { userId: user.id }, orderBy: { isDefault: "desc" } });

  const { orderNumber } = await orderService.createOrderFromQuotation({
    quotationId: quotation!.id,
    destination,
    addressId: address?.id,
  });

  redirect(`/account/orders?justPlaced=${orderNumber}`);
}

export async function declineQuotationAction(formData: FormData) {
  const user = await requireUser();
  const quotationId = String(formData.get("quotationId"));

  await db.quotation.updateMany({
    where: {
      id: quotationId,
      OR: [{ shopForMeRequest: { userId: user.id } }, { sourcingRequest: { userId: user.id } }],
    },
    data: { status: "DECLINED" },
  });

  redirect("/account/quotations");
}
