import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { StatusBadge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Payments" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  await requirePermission(PERMISSIONS.MANAGE_PAYMENTS);
  const payments = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: { order: { include: { user: true } } },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Payments</h1>
        <p className="text-sm text-navy-500">No live payment gateway is connected — all payments here are processed via the mock PaymentService.</p>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Method</th>
              <th className="p-3">Provider</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-medium text-navy-800">{p.order.orderNumber}</td>
                <td className="p-3 text-navy-500">{p.order.user.fullName}</td>
                <td className="p-3 text-navy-500">{p.method.replaceAll("_", " ")}</td>
                <td className="p-3 text-navy-500">{p.providerName}</td>
                <td className="p-3 text-navy-700">{formatMoney(p.amountMinor, p.currency)}</td>
                <td className="p-3"><StatusBadge status={p.status} /></td>
                <td className="p-3 text-navy-400">{formatDateTime(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
