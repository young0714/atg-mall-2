import { db } from "@/lib/db";
import { requireSeller } from "@/lib/auth/current-user";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Seller Dashboard" };
export const dynamic = "force-dynamic";

export default async function SellerDashboardPage() {
  const user = await requireSeller();
  const seller = await db.seller.findUnique({ where: { userId: user.id } });

  if (!seller) {
    return (
      <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
        No seller profile is set up for your account yet. Contact ATG Mall support to get started.
      </div>
    );
  }

  const [products, recentItems, commissions] = await Promise.all([
    db.product.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: "desc" } }),
    db.orderItem.findMany({
      where: { sellerIdSnapshot: seller.id },
      include: { order: true },
      orderBy: { order: { createdAt: "desc" } },
      take: 10,
    }),
    db.commission.findMany({ where: { sellerId: seller.id } }),
  ]);

  // Same cross-currency approximation used elsewhere in admin (sum raw
  // minor units) — a real multi-currency seller ledger is future work.
  const totalCommissionMinor = commissions.reduce((sum, c) => sum + c.amountMinor, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy-900">{seller.storeName}</h1>
          <p className="text-sm text-navy-500">Seller dashboard · Commission rate {seller.commissionPct}%</p>
        </div>
        <Badge tone={seller.status === "APPROVED" ? "green" : "neutral"}>{seller.status}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-navy-400">Products</p>
          <p className="mt-1 text-2xl font-display font-bold text-navy-900">{products.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-navy-400">Recent order lines</p>
          <p className="mt-1 text-2xl font-display font-bold text-navy-900">{recentItems.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-navy-400">Total commission (approx.)</p>
          <p className="mt-1 text-2xl font-display font-bold text-navy-900">{formatMoney(totalCommissionMinor, "NGN")}</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-navy-900">Your Products</h2>
        {products.length === 0 ? (
          <p className="text-sm text-navy-400">No products yet.</p>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-navy-50 py-2 text-sm last:border-0">
                <span className="font-medium text-navy-800">{p.name}</span>
                <span className="flex items-center gap-2">
                  {formatMoney(p.basePriceMinor, p.baseCurrency)}
                  <Badge tone={p.isActive ? "green" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-navy-900">Recent Order Activity</h2>
        {recentItems.length === 0 ? (
          <p className="text-sm text-navy-400">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {recentItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-navy-50 py-2 text-sm last:border-0">
                <span>{item.nameSnapshot} × {item.quantity} <span className="text-navy-400">· {formatDate(item.order.createdAt)}</span></span>
                <span className="font-medium">{formatMoney(item.unitPriceMinor * item.quantity, item.currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
