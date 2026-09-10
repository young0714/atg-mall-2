import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const packages = await db.package.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { warehouse: true },
  });

  return NextResponse.json({
    data: packages.map((p) => ({
      id: p.id,
      packageCode: p.packageCode,
      status: p.status,
      weightGrams: p.weightGrams,
      warehouse: p.warehouse?.name ?? null,
      shippingMethod: p.shippingMethod,
      destination: p.destination,
      createdAt: p.createdAt,
    })),
  });
}
