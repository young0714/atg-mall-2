import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Packages" };
export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  const user = await requireUser();
  const packages = await db.package.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { warehouse: true, order: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-navy-900">My Packages</h1>
      <p className="mt-1 text-sm text-navy-500">Every parcel received on your behalf at our China warehouse.</p>

      {packages.length === 0 ? (
        <div className="mt-8 rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
          No packages yet. Packages appear here once a supplier ships your order to our warehouse.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="px-3">Package ID</th>
                <th className="px-3">Order</th>
                <th className="px-3">Supplier</th>
                <th className="px-3">Weight</th>
                <th className="px-3">Warehouse</th>
                <th className="px-3">Method</th>
                <th className="px-3">Status</th>
                <th className="px-3">Received</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id} className="rounded-xl bg-white shadow-card">
                  <td className="rounded-l-xl px-3 py-3 font-medium text-navy-800">{pkg.packageCode}</td>
                  <td className="px-3 py-3 text-navy-500">{pkg.order?.orderNumber ?? "—"}</td>
                  <td className="px-3 py-3 text-navy-500">{pkg.supplierName ?? "—"}</td>
                  <td className="px-3 py-3 text-navy-500">{pkg.weightGrams ? `${(pkg.weightGrams / 1000).toFixed(2)} kg` : "—"}</td>
                  <td className="px-3 py-3 text-navy-500">{pkg.warehouse?.name ?? "—"}</td>
                  <td className="px-3 py-3 text-navy-500">{pkg.shippingMethod?.replaceAll("_", " ") ?? "—"}</td>
                  <td className="px-3 py-3"><StatusBadge status={pkg.status} /></td>
                  <td className="rounded-r-xl px-3 py-3 text-navy-400">{formatDate(pkg.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
