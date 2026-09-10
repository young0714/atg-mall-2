import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { issueRefundAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Refunds" };
export const dynamic = "force-dynamic";

export default async function AdminRefundsPage() {
  await requirePermission(PERMISSIONS.MANAGE_REFUNDS);

  const [refundable, refunded] = await Promise.all([
    db.order.findMany({
      where: { status: { in: ["PAID", "PROCESSING", "CANCELLED"] } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.order.findMany({ where: { status: "REFUNDED" }, include: { user: true }, orderBy: { updatedAt: "desc" }, take: 20 }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Refunds</h1>
        <p className="text-sm text-navy-500">Refunds are credited back to the customer&apos;s ATG Wallet as a ledgered transaction.</p>
      </div>

      <div className="card">
        <div className="border-b border-navy-100 p-5"><h2 className="font-semibold text-navy-900">Eligible Orders</h2></div>
        <div className="divide-y divide-navy-100">
          {refundable.map((o) => (
            <div key={o.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium text-navy-800">{o.orderNumber}</p>
                <p className="text-xs text-navy-400">{o.user.fullName} · {formatDate(o.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatMoney(o.totalMinor, o.currency)}</span>
                <form action={issueRefundAction}>
                  <input type="hidden" name="orderId" value={o.id} />
                  <button className="btn-outline btn-sm">Refund to Wallet</button>
                </form>
              </div>
            </div>
          ))}
          {refundable.length === 0 && <p className="p-4 text-sm text-navy-400">No orders currently eligible for refund.</p>}
        </div>
      </div>

      <div className="card">
        <div className="border-b border-navy-100 p-5"><h2 className="font-semibold text-navy-900">Recently Refunded</h2></div>
        <div className="divide-y divide-navy-100">
          {refunded.map((o) => (
            <div key={o.id} className="flex items-center justify-between p-4 text-sm">
              <span className="font-medium text-navy-800">{o.orderNumber}</span>
              <span className="text-navy-500">{formatMoney(o.totalMinor, o.currency)}</span>
            </div>
          ))}
          {refunded.length === 0 && <p className="p-4 text-sm text-navy-400">No refunds issued yet.</p>}
        </div>
      </div>
    </div>
  );
}
