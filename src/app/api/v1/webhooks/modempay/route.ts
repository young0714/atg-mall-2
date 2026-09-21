import { NextResponse } from "next/server";
import ModemPay from "modem-pay";
import { confirmModemPayTransaction } from "@/lib/services/paymentService";

/**
 * Modem Pay webhook — the authoritative source of truth for GMD payment
 * confirmation while Modem Pay is the active GMD provider (see
 * resolveProvider() in paymentService.ts). Verified via the SDK's own
 * webhooks.composeEventDetails, which checks the "x-modem-signature"
 * header against MODEMPAY_WEBHOOK_SECRET and throws on a bad signature —
 * never hand-rolled HMAC, unlike the Waychit webhook route.
 */
export async function POST(req: Request) {
  const secretKey = process.env.MODEMPAY_SECRET_KEY;
  const webhookSecret = process.env.MODEMPAY_WEBHOOK_SECRET;
  const signature = req.headers.get("x-modem-signature");
  const rawBody = await req.text();

  if (!secretKey || !webhookSecret || !signature) {
    return NextResponse.json({ error: "Not configured" }, { status: 401 });
  }

  let event: { event: string; payload: Record<string, unknown> };
  try {
    event = new ModemPay(secretKey).webhooks.composeEventDetails(rawBody, signature, webhookSecret) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // confirmModemPayTransaction only ever marks a Payment SUCCESSFUL when
  // Modem Pay's own re-verify (a fresh retrieve() call, not this payload)
  // says so — safe to call for every terminal event, not just the
  // successful one, so a Payment left PENDING after a failure/cancellation
  // still gets a chance to resolve correctly.
  const paymentIntentId = event.payload?.payment_intent_id;
  const terminalEvents = ["charge.succeeded", "charge.failed", "charge.cancelled"];
  if (typeof paymentIntentId === "string" && terminalEvents.includes(event.event)) {
    await confirmModemPayTransaction(paymentIntentId);
  }

  // Always ack 200 once the signature checks out — same convention as the
  // Waychit route: a validly-received "failed" event is still validly
  // received, just not a paid one.
  return NextResponse.json({ received: true });
}
