import { NextResponse } from "next/server";
import crypto from "crypto";
import { confirmWaychitTransaction } from "@/lib/services/paymentService";

/**
 * Waychit webhook — the authoritative source of truth for GMD payment
 * confirmation. Verified via the "Waychit-Signature" header (format
 * "t=<timestamp>,v1=<sig>[,v1=<sig>...]" — multiple v1 values appear during
 * secret rotation), per Waychit's own reference implementation
 * (waychit.com/developers#webhooks): HMAC-SHA256 of "<timestamp>.<rawBody>"
 * using WAYCHIT_WEBHOOK_SECRET, checked against every v1 value, plus a
 * 5-minute freshness window on the timestamp (their sample code doesn't
 * check this, but their own docs prose calls for it).
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.WAYCHIT_WEBHOOK_SECRET;
  const signatureHeader = req.headers.get("Waychit-Signature");
  const rawBody = await req.text();

  if (!webhookSecret || !signatureHeader || !isValidWaychitSignature(signatureHeader, rawBody, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const waychitId = body?.data?.id;
  if (!waychitId) {
    return NextResponse.json({ error: "Missing payment request id" }, { status: 400 });
  }

  await confirmWaychitTransaction(String(waychitId));

  // Always ack 200 once the signature checks out — Waychit retries for up
  // to 24h on anything else, and a "failed" event is still a validly
  // received one, just not a paid one.
  return NextResponse.json({ received: true });
}

function isValidWaychitSignature(signatureHeader: string, rawBody: string, webhookSecret: string): boolean {
  const parts = signatureHeader.split(",").map((p) => p.trim());

  const timestampPart = parts.find((part) => part.startsWith("t="));
  if (!timestampPart) return false;
  const timestamp = timestampPart.slice(2);

  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (signatures.length === 0) return false;

  const fiveMinutesMs = 5 * 60 * 1000;
  if (Math.abs(Date.now() - Number(timestamp) * 1000) > fiveMinutesMs) return false;

  const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");

  return signatures.some((sig) => {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSignature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
