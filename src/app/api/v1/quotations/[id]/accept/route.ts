import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { orderService } from "@/lib/services/orderService";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const quotation = await db.quotation.findFirst({
    where: {
      id: params.id,
      status: "PENDING",
      OR: [{ shopForMeRequest: { userId: user.id } }, { sourcingRequest: { userId: user.id } }],
    },
    include: { shopForMeRequest: true, sourcingRequest: true },
  });
  if (!quotation) return NextResponse.json({ error: "Quotation not found or already processed" }, { status: 404 });

  const destination = quotation.shopForMeRequest?.destination ?? quotation.sourcingRequest?.destination ?? "NIGERIA";
  const address = await db.address.findFirst({ where: { userId: user.id }, orderBy: { isDefault: "desc" } });

  const result = await orderService.createOrderFromQuotation({
    quotationId: quotation.id,
    destination,
    addressId: address?.id,
  });

  return NextResponse.json({ data: result });
}
