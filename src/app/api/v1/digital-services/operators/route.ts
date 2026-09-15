import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { reloadlyService } from "@/lib/services/reloadlyService";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const countryIso = new URL(request.url).searchParams.get("country");
  if (!countryIso || countryIso.length !== 2) {
    return NextResponse.json({ error: "A 2-letter country code is required" }, { status: 400 });
  }

  const operators = await reloadlyService.getOperators(countryIso.toUpperCase());
  return NextResponse.json({ data: operators });
}
