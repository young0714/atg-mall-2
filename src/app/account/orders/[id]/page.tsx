import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/Badge";
import { StatusTimeline } from "@/components/tracking/StatusTimeline";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { payOrderWithWalletAction } from "./actions";

export const metadata: Metadata = { title: "Order Details" };
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { paid?: string; error?: string };
}) {
  const user = await requireUser();

  const order = await db.order.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      items: true,
      address: true,
      payments: true,
      trackingEvents: { orderBy: { occurredAt: "desc" } },
      packages: true,
    },
  });

  if (!order) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy-900">{order.orderNumber}</h1>
          <p className="text-sm text-navy-500">Placed {formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} className="text-sm" />
      </div>

      {searchParams.paid && (
        <div className="mt-4 rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Payment successful!</div>
      )}
      {searchParams.error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}
      {order.status === "PENDING_PAYMENT" && (
        <form action={payOrderWithWalletAction} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-gold-200 bg-gold-50 p-4">
          <input type="hidden" name="orderId" value={order.id} />
          <p className="text-sm text-gold-800">
            This order is awaiting payment of {formatMoney(order.totalMinor, order.currency)}.
          </p>
          <button type="submit" className="btn-gold btn-sm">Pay with Wallet</button>
        </form>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Items</h2>
            <div className="divide-y divide-navy-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between py-2 text-sm">
                  <span className="text-navy-700">{item.nameSnapshot} × {item.quantity}</span>
                  <span className="font-medium text-navy-800">{formatMoney(item.unitPriceMinor * item.quantity, item.currency)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-navy-900">Order Timeline</h2>
            <StatusTimeline events={order.trackingEvents} />
          </div>

          {order.packages.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold text-navy-900">Packages</h2>
              <div className="space-y-2">
                {order.packages.map((pkg) => (
                  <Link key={pkg.id} href={`/account/packages`} className="flex items-center justify-between rounded-lg border border-navy-100 p-3 text-sm hover:bg-sand-50">
                    <span className="font-medium text-navy-800">{pkg.packageCode}</span>
                    <StatusBadge status={pkg.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Cost Breakdown</h2>
            <dl className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatMoney(order.subtotalMinor, order.currency)} />
              <Row label="Service fee" value={formatMoney(order.serviceFeeMinor, order.currency)} />
              <Row label="China domestic shipping" value={formatMoney(order.domesticShippingMinor, order.currency)} />
              <Row label="International shipping" value={formatMoney(order.intlShippingMinor, order.currency)} />
              {order.otherChargesMinor > 0 && <Row label="Other charges" value={formatMoney(order.otherChargesMinor, order.currency)} />}
              <div className="border-t border-navy-100 pt-1.5">
                <Row label="Total" value={formatMoney(order.totalMinor, order.currency)} bold />
              </div>
            </dl>
          </div>

          {order.address && (
            <div className="card p-5">
              <h2 className="mb-2 font-semibold text-navy-900">Delivery Address</h2>
              <p className="text-sm text-navy-600">
                {order.address.fullName}<br />
                {order.address.addressLine1}, {order.address.city}, {order.address.state}<br />
                {order.address.country === "NIGERIA" ? "Nigeria" : "Gambia"}<br />
                {order.address.phone}
              </p>
            </div>
          )}

          {order.payments.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-2 font-semibold text-navy-900">Payments</h2>
              {order.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-navy-500">{p.method.replaceAll("_", " ")}</span>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-navy-500">{label}</dt>
      <dd className={bold ? "font-bold text-navy-900" : "font-medium text-navy-700"}>{value}</dd>
    </div>
  );
}
