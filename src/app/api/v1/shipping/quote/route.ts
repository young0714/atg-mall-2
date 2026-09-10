import { NextRequest, NextResponse } from "next/server";
import { shippingQuoteSchema } from "@/lib/validation/schemas";
import { shippingService } from "@/lib/services/shippingService";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = shippingQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const quote = await shippingService.getQuote(parsed.data);
  if (!quote) {
    return NextResponse.json({ error: "No shipping rate configured for this destination/method yet." }, { status: 404 });
  }

  return NextResponse.json({ data: quote });
}
