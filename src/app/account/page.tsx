import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { Stat } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { WAREHOUSE_STATUSES, ACTIVE_SHIPMENT_STATUSES } from "@/lib/packageStatus";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Account" };
export const dynamic = "force-dynamic";

export default async function AccountOverviewPage({
  searchParams,
}: {
  searchParams: { welcome?: string; passwordSet?: string; justRegistered?: string };
}) {
  const user = await requireUser();

  const [wallet, recentOrders, packageCounts, pendingQuotations] = await Promise.all([
    db.wallet.findUnique({ where: { userId: user.id } }),
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.package.groupBy({ by: ["status"], where: { userId: user.id }, _count: true }),
    db.quotation.findMany({
      where: {
        status: "PENDING",
        OR: [{ shopForMeRequest: { userId: user.id } }, { sourcingRequest: { userId: user.id } }],
      },
      take: 5,
    }),
  ]);

  const activeShipmentsCount = packageCounts
    .filter((p) => (ACTIVE_SHIPMENT_STATUSES as string[]).includes(p.status))
    .reduce((sum, p) => sum + p._count, 0);
  const inWarehouseCount = packageCounts
    .filter((p) => (WAREHOUSE_STATUSES as string[]).includes(p.status))
    .reduce((sum, p) => sum + p._count, 0);

  return (
    <div className="space-y-8">
      {searchParams.justRegistered && (
        <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
          Welcome to ATG Mall! Your account is ready, start shopping, sourcing or shipping whenever you&apos;re ready.
        </div>
      )}
      {searchParams.welcome && (
        <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
          You&apos;re signed in. Set a password below to make it easier to come back next time.
        </div>
      )}
      {searchParams.passwordSet && (
        <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
          Password set. You can now sign in with your email and password.
        </div>
      )}
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Welcome back, {user.fullName.split(" ")[0]}</h1>
        <p className="text-sm text-navy-500">Here&apos;s what&apos;s happening with your ATG Mall account.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link href="/account/wallet" className="block">
          <Stat label="Wallet Balance" value={wallet ? formatMoney(wallet.balanceMinor, wallet.currency) : "—"} tone="green" />
        </Link>
        <Link href="/account/packages?filter=warehouse" className="block">
          <Stat label="Packages in Warehouse" value={inWarehouseCount} tone="blue" />
        </Link>
        <Link href="/account/packages?filter=shipments" className="block">
          <Stat label="Active Shipments" value={activeShipmentsCount} tone="navy" />
        </Link>
        <Link href="/account/quotations" className="block">
          <Stat label="Pending Quotations" value={pendingQuotations.length} tone="gold" />
        </Link>
      </div>

      {pendingQuotations.length > 0 && (
        <div className="rounded-xl2 border border-gold-200 bg-gold-50 p-4">
          <p className="text-sm font-semibold text-gold-800">You have {pendingQuotations.length} quotation(s) awaiting your review.</p>
          <Link href="/account/quotations" className="mt-1 inline-block text-sm font-medium text-gold-700 underline">
            Review quotations →
          </Link>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between border-b border-navy-100 p-5">
          <h2 className="font-semibold text-navy-900">Recent Orders</h2>
          <Link href="/account/orders" className="text-sm font-medium text-atgblue-600">View all</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="p-5 text-sm text-navy-400">No orders yet. <Link href="/shop" className="underline">Start shopping</Link>.</p>
        ) : (
          <div className="divide-y divide-navy-100">
            {recentOrders.map((order) => (
              <Link key={order.id} href={`/account/orders/${order.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-sand-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy-800">{order.orderNumber}</p>
                  <p className="text-xs text-navy-400">{formatDate(order.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium text-navy-700">{formatMoney(order.totalMinor, order.currency)}</span>
                  <StatusBadge status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
