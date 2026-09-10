import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { StatusBadge } from "@/components/ui/Badge";
import { updateSellerStatusAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Sellers" };
export const dynamic = "force-dynamic";

export default async function AdminSellersPage() {
  await requirePermission(PERMISSIONS.MANAGE_SELLERS);
  const sellers = await db.seller.findMany({ include: { user: true, _count: { select: { products: true } } } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Sellers</h1>
        <p className="text-sm text-navy-500">
          Marketplace sellers (Phase 3). The schema and approval workflow are ready — seller self-registration UI is
          not yet built in this MVP.
        </p>
      </div>

      {sellers.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
          No sellers have registered yet.
        </div>
      ) : (
        <div className="space-y-3">
          {sellers.map((s) => (
            <div key={s.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-navy-800">{s.storeName}</p>
                <p className="text-xs text-navy-400">{s.user.fullName} · {s._count.products} products</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={s.status} />
                <form action={updateSellerStatusAction} className="flex gap-1">
                  <input type="hidden" name="sellerId" value={s.id} />
                  <button name="status" value="APPROVED" className="btn-outline btn-sm">Approve</button>
                  <button name="status" value="SUSPENDED" className="btn-ghost btn-sm text-red-600">Suspend</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
