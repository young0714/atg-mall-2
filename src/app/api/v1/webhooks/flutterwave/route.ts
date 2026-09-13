import { NextResponse } from "next/server";
import { confirmFlutterwaveTransaction } from "@/lib/services/paymentService";

/**
 * Flutterwave webhook — the authoritative source of truth for payment
 * confirmation. Verified via the shared secret hash Flutterwave sends in
 * the "verif-hash" header (set to FLUTTERWAVE_WEBHOOK_HASH in the
 * Flutterwave dashboard under Settings -> Webhooks), never trusted based on
 * payload content alone. Always re-verifies the transaction against
 * Flutterwave's own API before touching the database — see
 * confirmFlutterwaveTransaction in paymentService.ts.
 */
export async function POST(req: Request) {
  const expectedHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  const receivedHash = req.headers.get("verif-hash");

  if (!expectedHash || !receivedHash || receivedHash !== expectedHash) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const transactionId = body?.data?.id;
  if (!transactionId) {
    return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
  }

  await confirmFlutterwaveTransaction(String(transactionId));

  // Always ack 200 once the signature checks out — a "failed" transaction
  // webhook is still a validly received one, just not a paid one.
  return NextResponse.json({ received: true });
}
