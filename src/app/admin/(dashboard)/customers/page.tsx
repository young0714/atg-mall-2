import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Customers" };
export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  await requirePermission(PERMISSIONS.MANAGE_CUSTOMERS);

  const customers = await db.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    include: { customerProfile: true, orders: true, wallet: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Customers</h1>
        <p className="text-sm text-navy-500">{customers.length} registered customers</p>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Country</th>
              <th className="p-3">Orders</th>
              <th className="p-3">Status</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-medium text-navy-800">{c.fullName}</td>
                <td className="p-3 text-navy-500">{c.email}</td>
                <td className="p-3 text-navy-500">{c.customerProfile?.country === "GAMBIA" ? "🇬🇲 Gambia" : "🇳🇬 Nigeria"}</td>
                <td className="p-3 text-navy-500">{c.orders.length}</td>
                <td className="p-3"><Badge tone={c.isActive ? "green" : "red"}>{c.isActive ? "Active" : "Disabled"}</Badge></td>
                <td className="p-3 text-navy-400">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
