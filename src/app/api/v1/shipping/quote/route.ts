import { NextRequest, NextResponse } from "next/server";
import { shippingQuoteSchema } from "@/lib/validation/schemas";
import { shippingService } from "@/lib/services/shippingService";

// LEGACY: this public v1 endpoint still serves quotes from the legacy
// per-kg ShippingRate table, not the new rate-card shipping calculation
// engine (see src/lib/services/shipping/). Left as-is deliberately — this
// is a versioned public API contract, and swapping its data source out
// from under existing callers is a breaking change, not a cleanup. A v2 of
// this endpoint backed by shippingCalculationService would be the place to
// expose the new engine's multi-service-level quotes externally.

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
