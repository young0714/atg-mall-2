import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { StatusBadge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_FLOW } from "@/lib/constants";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Orders" };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_ORDERS);

  const orders = await db.order.findMany({
    where: searchParams.status ? { status: searchParams.status as never } : undefined,
    orderBy: { createdAt: "desc" },
    include: { user: true, items: true },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-navy-900">Orders</h1>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/orders" className={`badge ${!searchParams.status ? "bg-navy-900 text-white" : "bg-navy-50 text-navy-500"}`}>All</Link>
        {ORDER_STATUS_FLOW.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={`badge ${searchParams.status === s ? "bg-navy-900 text-white" : "bg-navy-50 text-navy-500"}`}>
            {s.replaceAll("_", " ")}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Items</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {orders.map((o) => (
              <tr key={o.id} className="cursor-pointer hover:bg-sand-50">
                <td className="p-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-atgblue-600">{o.orderNumber}</Link>
                </td>
                <td className="p-3 text-navy-600">{o.user.fullName}</td>
                <td className="p-3 text-navy-500">{o.items.length}</td>
                <td className="p-3 text-navy-700">{formatMoney(o.totalMinor, o.currency)}</td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
                <td className="p-3 text-navy-400">{formatDateTime(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
