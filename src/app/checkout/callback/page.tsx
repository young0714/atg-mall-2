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
  searchParams: { status?: string; transaction_id?: string; tx_ref?: string };
}) {
  // Flutterwave redirects the customer's browser here after the hosted
  // checkout page — this is a UX convenience only, never the source of
  // truth. The webhook (api/v1/webhooks/flutterwave) confirms payment
  // independently and will have already done so, or will shortly; calling
  // confirmFlutterwaveTransaction here again is safe (idempotent) and just
  // covers the case where the webhook hasn't landed yet.
  const cancelled = searchParams.status === "cancelled";
  const result =
    !cancelled && searchParams.transaction_id
      ? await confirmFlutterwaveTransaction(searchParams.transaction_id)
      : { ok: false };

  const order = result.ok && result.orderId ? await db.order.findUnique({ where: { id: result.orderId } }) : null;

  return (
    <Section className="!py-16">
      <Container className="max-w-md">
        <div className="card p-7 text-center">
          {result.ok && order ? (
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
                  : "We couldn't confirm this payment. If you were charged, it may take a few minutes to reflect — check your order, or try again."}
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
