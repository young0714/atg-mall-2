import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { StatusBadge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_FLOW } from "@/lib/constants";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Orders" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_ORDERS);

  const currentPage = Math.max(1, Math.trunc(Number(searchParams.page)) || 1);
  const where = searchParams.status ? { status: searchParams.status as never } : undefined;

  const [totalCount, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: true, items: true },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(page: number): string {
    const params = new URLSearchParams();
    if (searchParams.status) params.set("status", searchParams.status);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Orders</h1>
        <p className="mt-1 text-sm text-navy-500">
          {totalCount === 0
            ? "0 orders"
            : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, totalCount)} of ${totalCount} order${totalCount === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/orders" className={`badge ${!searchParams.status ? "bg-navy-900 text-white" : "bg-navy-50 text-navy-500"}`}>All</Link>
        {ORDER_STATUS_FLOW.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={`badge ${searchParams.status === s ? "bg-navy-900 text-white" : "bg-navy-50 text-navy-500"}`}>
            {s.replaceAll("_", " ")}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
          {searchParams.status ? `No ${searchParams.status.replaceAll("_", " ").toLowerCase()} orders.` : "No orders yet."}
        </div>
      ) : (
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
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} hrefForPage={pageHref} />
    </div>
  );
}
