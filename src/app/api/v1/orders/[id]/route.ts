import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const order = await db.order.findFirst({
    where: { id: params.id, userId: user.id },
    include: { items: true, trackingEvents: { orderBy: { occurredAt: "desc" } }, payments: true, address: true },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  return NextResponse.json({ data: order });
}
