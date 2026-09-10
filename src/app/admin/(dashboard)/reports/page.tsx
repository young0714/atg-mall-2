import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Stat } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { COUNTRY_LABELS, COUNTRY_FLAGS } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Reports" };
export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requirePermission(PERMISSIONS.VIEW_REPORTS);

  const [
    ordersByDestination,
    ordersByStatus,
    orderItemsByProduct,
    shopForMeByStatus,
    sourcingByStatus,
    walletsByCurrency,
    coupons,
    packagesByStatus,
  ] = await Promise.all([
    db.order.groupBy({
      by: ["destination", "currency"],
      _count: { _all: true },
      _sum: { totalMinor: true },
      where: { status: { not: "CANCELLED" } },
    }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    db.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    }),
    db.shopForMeRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    db.sourcingRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    db.wallet.groupBy({ by: ["currency"], _sum: { balanceMinor: true }, _count: { _all: true } }),
    db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    db.package.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const productIds = orderItemsByProduct.map((r) => r.productId).filter((id): id is string => !!id);
  const products = productIds.length
    ? await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const productNameById = new Map(products.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Reports</h1>
        <p className="text-sm text-navy-500">
          Operational and financial breakdowns across Nigeria and Gambia. Figures reflect data stored in ATG Mall —
          revenue is shown per currency and is not converted or combined, since a single blended total across NGN and
          GMD would be misleading.
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-navy-900">Orders &amp; Revenue by Destination</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordersByDestination.length === 0 && (
            <p className="text-sm text-navy-400">No non-cancelled orders yet.</p>
          )}
          {ordersByDestination.map((row) => (
            <Stat
              key={`${row.destination}-${row.currency}`}
              label={`${COUNTRY_FLAGS[row.destination]} ${COUNTRY_LABELS[row.destination]} (${row.currency})`}
              value={formatMoney(row._sum.totalMinor ?? 0, row.currency)}
              hint={`${row._count._all} order${row._count._all === 1 ? "" : "s"}`}
              tone="blue"
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-navy-900">Order Status Distribution</h2>
        <div className="card divide-y divide-navy-100">
          {ordersByStatus.map((row) => (
            <div key={row.status} className="flex items-center justify-between px-5 py-3">
              <StatusBadge status={row.status} />
              <span className="text-sm font-medium text-navy-700">{row._count._all}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-navy-900">Package Pipeline</h2>
        <div className="card divide-y divide-navy-100">
          {packagesByStatus.map((row) => (
            <div key={row.status} className="flex items-center justify-between px-5 py-3">
              <StatusBadge status={row.status} />
              <span className="text-sm font-medium text-navy-700">{row._count._all}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-navy-900">Top Products by Units Sold</h2>
        <div className="card divide-y divide-navy-100">
          {orderItemsByProduct.length === 0 && <p className="p-5 text-sm text-navy-400">No order items yet.</p>}
          {orderItemsByProduct.map((row) => (
            <div key={row.productId ?? "unknown"} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-navy-700">
                {row.productId ? productNameById.get(row.productId) ?? "Deleted product" : "Custom / Shop-for-Me item"}
              </span>
              <span className="text-sm font-medium text-navy-700">{row._sum.quantity} units</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold text-navy-900">Shop-for-Me Funnel</h2>
          <div className="card divide-y divide-navy-100">
            {shopForMeByStatus.map((row) => (
              <div key={row.status} className="flex items-center justify-between px-5 py-3">
                <StatusBadge status={row.status} />
                <span className="text-sm font-medium text-navy-700">{row._count._all}</span>
              </div>
            ))}
            {shopForMeByStatus.length === 0 && <p className="p-5 text-sm text-navy-400">No requests yet.</p>}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-semibold text-navy-900">Source-a-Product Funnel</h2>
          <div className="card divide-y divide-navy-100">
            {sourcingByStatus.map((row) => (
              <div key={row.status} className="flex items-center justify-between px-5 py-3">
                <StatusBadge status={row.status} />
                <span className="text-sm font-medium text-navy-700">{row._count._all}</span>
              </div>
            ))}
            {sourcingByStatus.length === 0 && <p className="p-5 text-sm text-navy-400">No requests yet.</p>}
          </div>
        </section>
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-navy-900">Wallet Balances Held (by currency)</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {walletsByCurrency.map((row) => (
            <Stat
              key={row.currency}
              label={row.currency}
              value={formatMoney(row._sum.balanceMinor ?? 0, row.currency)}
              hint={`${row._count._all} wallet${row._count._all === 1 ? "" : "s"}`}
              tone="green"
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-navy-900">Coupons</h2>
        <div className="card divide-y divide-navy-100">
          {coupons.length === 0 && <p className="p-5 text-sm text-navy-400">No coupons created yet.</p>}
          {coupons.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium text-navy-800">{c.code}</p>
                <p className="text-xs text-navy-400">
                  {c.type === "PERCENTAGE" ? `${c.value}% off` : `${formatMoney(c.value, c.currency ?? "NGN")} off`}
                  {c.usageLimit ? ` · limit ${c.usageLimit}` : ""}
                </p>
              </div>
              <span className="text-navy-600">
                {c.usedCount} used{c.isActive ? "" : " · inactive"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
