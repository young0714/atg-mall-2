import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json({
    data: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, phone: user.phone },
  });
}
