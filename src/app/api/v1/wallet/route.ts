import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const wallet = await db.wallet.findUnique({ where: { userId: user.id } });
  if (!wallet) return NextResponse.json({ data: null });

  return NextResponse.json({ data: { balanceMinor: wallet.balanceMinor, currency: wallet.currency } });
}
