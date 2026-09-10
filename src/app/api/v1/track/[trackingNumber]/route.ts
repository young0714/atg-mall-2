import { NextResponse } from "next/server";
import { trackingService } from "@/lib/services/trackingService";

/** GET /api/v1/track/:trackingNumber — public, no auth required. */
export async function GET(_req: Request, { params }: { params: { trackingNumber: string } }) {
  const result = await trackingService.track(decodeURIComponent(params.trackingNumber));
  if (!result) return NextResponse.json({ error: "Tracking number not found" }, { status: 404 });
  return NextResponse.json({ data: result });
}
