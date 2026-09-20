import { Container, Section } from "@/components/ui/Section";
import { confirmFlutterwaveTransaction } from "@/lib/services/paymentService";
import { db } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payment" };
export const dynamic = "force-dynamic";

export default async function CheckoutCallbackPage({
  searchParams,
}: {
  searchParams: { status?: string; transaction_id?: string; tx_ref?: string; wcref?: string; failed?: string };
}) {
  // Flutterwave redirects the customer's browser here after the hosted
  // checkout page — this is a UX convenience only, never the source of
  // truth. The webhook (api/v1/webhooks/flutterwave) confirms payment
  // independently and will have already done so, or will shortly; calling
  // confirmFlutterwaveTransaction here again is safe (idempotent) and just
  // covers the case where the webhook hasn't landed yet.
  const cancelled = searchParams.status === "cancelled" || searchParams.failed === "1";

  let orderId: string | undefined;
  if (!cancelled && searchParams.transaction_id) {
    const result = await confirmFlutterwaveTransaction(searchParams.transaction_id);
    orderId = result.ok ? result.orderId : undefined;
  } else if (!cancelled && searchParams.wcref) {
    // Waychit: unlike Flutterwave, there's no documented sandbox to confirm
    // whether their redirect reliably carries their own payment-request id,
    // so we don't call confirmWaychitTransaction (webhook-only, authoritative
    // path — see paymentService.ts) here. Instead just read our own Payment
    // row by the clientReference we embedded in the redirect URL ourselves;
    // if the webhook already landed, status reflects that already.
    const payment = await db.payment.findFirst({ where: { providerRef: searchParams.wcref } });
    orderId = payment?.status === "SUCCESSFUL" ? (payment.orderId ?? undefined) : undefined;
  }

  const order = orderId ? await db.order.findUnique({ where: { id: orderId } }) : null;

  return (
    <Section className="!py-16">
      <Container className="max-w-md">
        <div className="card p-7 text-center">
          {order ? (
            <>
              <h1 className="text-xl font-display font-bold text-navy-900">Payment confirmed</h1>
              <p className="mt-1 text-sm text-navy-500">
                Order <strong>{order.orderNumber}</strong> is paid.
              </p>
              <Link href={`/account/orders/${order.id}`} className="btn-primary mt-5 inline-block">
                View order
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-display font-bold text-navy-900">
                {cancelled ? "Payment cancelled" : "Payment didn't go through"}
              </h1>
              <p className="mt-1 text-sm text-navy-500">
                {cancelled
                  ? "You cancelled the payment before it completed."
                  : "We couldn't confirm this payment. If you were charged, it may take a few minutes to reflect. Check your order, or try again."}
              </p>
              <Link href="/account/orders" className="btn-outline mt-5 inline-block">
                View my orders
              </Link>
            </>
          )}
        </div>
      </Container>
    </Section>
  );
}
