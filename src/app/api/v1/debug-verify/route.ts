// TEMPORARY — read-only diagnostic to confirm Flutterwave's real verify
// response shape for a bank-transfer payment against a live transaction.
// POST-only, requires the exact tx_ref, makes zero writes. Delete this file
// once the field names are confirmed.
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "no key configured" }, { status: 500 });

  const { txRef } = await req.json().catch(() => ({}));
  if (!txRef || typeof txRef !== "string") {
    return NextResponse.json({ error: "missing txRef" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  const body = await res.json().catch(() => null);
  return NextResponse.json(body, { status: res.status });
}
