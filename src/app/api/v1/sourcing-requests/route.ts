import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { sourcingRequestSchema } from "@/lib/validation/schemas";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const requests = await db.sourcingRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { options: true },
  });
  return NextResponse.json({ data: requests });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = sourcingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const request = await db.sourcingRequest.create({
    data: {
      userId: user.id,
      ...parsed.data,
      productImageUrl: parsed.data.productImageUrl || undefined,
      productUrl: parsed.data.productUrl || undefined,
      targetCurrency: "USD",
    },
  });

  return NextResponse.json({ data: request }, { status: 201 });
}
