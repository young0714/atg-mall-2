import { db } from "@/lib/db";
import { Stat } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [
    totalOrders,
    pendingOrders,
    deliveredOrders,
    revenueAgg,
    shippingRevenueAgg,
    sourcingOrdersAgg,
    activeCustomers,
    packagesInWarehouse,
    packagesInTransit,
    deliveredPackages,
    nigeriaCustomers,
    gambiaCustomers,
    recentOrders,
    ordersForMargin,
  ] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.order.count({ where: { status: "DELIVERED" } }),
    db.order.aggregate({ _sum: { totalMinor: true }, where: { status: { not: "CANCELLED" } } }),
    db.order.aggregate({ _sum: { intlShippingMinor: true } }),
    db.order.aggregate({ _sum: { serviceFeeMinor: true }, where: { source: { in: ["SHOP_FOR_ME", "SOURCING"] } } }),
    db.user.count({ where: { role: "CUSTOMER", isActive: true } }),
    db.package.count({ where: { status: { in: ["RECEIVED", "INSPECTION", "AWAITING_CUSTOMER_INSTRUCTION", "CONSOLIDATION", "READY_TO_SHIP"] } } }),
    db.package.count({ where: { status: { in: ["SHIPPED", "IN_TRANSIT", "CUSTOMS", "OUT_FOR_DELIVERY"] } } }),
    db.package.count({ where: { status: "DELIVERED" } }),
    db.customerProfile.count({ where: { country: "NIGERIA" } }),
    db.customerProfile.count({ where: { country: "GAMBIA" } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: true } }),
    db.order.findMany({
      where: { status: { not: "CANCELLED" } },
      select: {
        totalMinor: true,
        domesticShippingMinor: true,
        intlShippingMinor: true,
        otherChargesMinor: true,
        items: { select: { costBasisMinor: true, quantity: true } },
      },
    }),
  ]);

  // Same crude cross-currency approximation the GMV tile already uses (sum
  // raw minor units regardless of each order's actual currency) — not a
  // real FX-converted total, just a directional estimate. Items without a
  // recorded cost basis (pre-Phase-3 orders) are excluded from their
  // order's cost side, so those orders skew optimistic.
  const estimatedMarginMinor = ordersForMargin.reduce((total, order) => {
    const costBasis = order.items.reduce((sum, item) => sum + (item.costBasisMinor ?? 0) * item.quantity, 0);
    return total + order.totalMinor - costBasis - order.domesticShippingMinor - order.intlShippingMinor - order.otherChargesMinor;
  }, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Dashboard</h1>
        <p className="text-sm text-navy-500">Overview of ATG Mall operations across Nigeria and Gambia.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Orders" value={totalOrders} />
        <Stat label="Pending Orders" value={pendingOrders} tone="gold" />
        <Stat label="Delivered Orders" value={deliveredOrders} tone="green" />
        <Stat label="GMV (all currencies, mixed)" value={formatMoney(revenueAgg._sum.totalMinor ?? 0, "NGN")} tone="blue" hint="Approximate — orders span multiple currencies" />
        <Stat label="Shipping Revenue" value={formatMoney(shippingRevenueAgg._sum.intlShippingMinor ?? 0, "NGN")} />
        <Stat label="Sourcing/Service Revenue" value={formatMoney(sourcingOrdersAgg._sum.serviceFeeMinor ?? 0, "NGN")} />
        <Stat label="Est. Margin" value={formatMoney(estimatedMarginMinor, "NGN")} tone="gold" hint="Approximate — mixed currencies; excludes items without recorded cost" />
        <Stat label="Active Customers" value={activeCustomers} />
        <Stat label="Packages in Warehouse" value={packagesInWarehouse} tone="blue" />
        <Stat label="Packages in Transit" value={packagesInTransit} tone="blue" />
        <Stat label="Delivered Packages" value={deliveredPackages} tone="green" />
        <Stat label="Nigeria Customers" value={nigeriaCustomers} />
        <Stat label="Gambia Customers" value={gambiaCustomers} />
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-navy-100 p-5">
          <h2 className="font-semibold text-navy-900">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm font-medium text-atgblue-600">View all</Link>
        </div>
        <div className="divide-y divide-navy-100">
          {recentOrders.map((order) => (
            <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between p-4 hover:bg-sand-50">
              <div>
                <p className="text-sm font-semibold text-navy-800">{order.orderNumber}</p>
                <p className="text-xs text-navy-400">{order.user.fullName} · {formatDateTime(order.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-navy-700">{formatMoney(order.totalMinor, order.currency)}</span>
                <StatusBadge status={order.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
