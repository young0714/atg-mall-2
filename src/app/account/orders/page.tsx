import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { justPlaced?: string; paymentError?: string };
}) {
  const user = await requireUser();
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-navy-900">My Orders</h1>

      {searchParams.justPlaced && !searchParams.paymentError && (
        <div className="mt-4 rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
          Order <strong>{searchParams.justPlaced}</strong> placed successfully!
        </div>
      )}
      {searchParams.justPlaced && searchParams.paymentError && (
        <div className="mt-4 rounded-lg bg-gold-50 p-3 text-sm text-gold-700">
          Order <strong>{searchParams.justPlaced}</strong> was created, but payment didn&apos;t go through:{" "}
          {searchParams.paymentError} Open the order below to retry payment.
        </div>
      )}

      {orders.length === 0 ? (
        <div className="mt-8 rounded-xl2 border border-dashed border-navy-200 p-12 text-center">
          <p className="text-navy-500">You haven&apos;t placed any orders yet.</p>
          <Link href="/shop" className="btn-primary mt-4 inline-flex">Start shopping</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/account/orders/${order.id}`} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold text-navy-800">{order.orderNumber}</p>
                <p className="text-xs text-navy-400">
                  {formatDate(order.createdAt)} · {order.items.length} item{order.items.length === 1 ? "" : "s"} · {order.source.replaceAll("_", " ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-medium text-navy-700">{formatMoney(order.totalMinor, order.currency)}</span>
                <StatusBadge status={order.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
