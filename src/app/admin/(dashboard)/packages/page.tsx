import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { StatusBadge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Form";
import { PACKAGE_STATUS_FLOW } from "@/lib/constants";
import { updatePackageStatusAction } from "./actions";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Packages" };
export const dynamic = "force-dynamic";

export default async function AdminPackagesPage() {
  await requirePermission(PERMISSIONS.MANAGE_WAREHOUSE);

  const packages = await db.package.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, order: true },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-navy-900">Packages</h1>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Package</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Order</th>
              <th className="p-3">Weight</th>
              <th className="p-3">Status</th>
              <th className="p-3">Received</th>
              <th className="p-3">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {packages.map((pkg) => (
              <tr key={pkg.id}>
                <td className="p-3 font-medium text-navy-800">{pkg.packageCode}</td>
                <td className="p-3 text-navy-500">{pkg.user ? pkg.user.fullName : "—"}</td>
                <td className="p-3 text-navy-500">{pkg.order?.orderNumber ?? "—"}</td>
                <td className="p-3 text-navy-500">{pkg.weightGrams ? `${(pkg.weightGrams / 1000).toFixed(2)}kg` : "—"}</td>
                <td className="p-3"><StatusBadge status={pkg.status} /></td>
                <td className="p-3 text-navy-400">{formatDate(pkg.createdAt)}</td>
                <td className="p-3">
                  <form action={updatePackageStatusAction} className="flex items-center gap-2">
                    <input type="hidden" name="packageId" value={pkg.id} />
                    <Select name="status" defaultValue={pkg.status} className="w-auto !py-1 text-xs">
                      {PACKAGE_STATUS_FLOW.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
                    </Select>
                    <button type="submit" className="btn-outline btn-sm">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
