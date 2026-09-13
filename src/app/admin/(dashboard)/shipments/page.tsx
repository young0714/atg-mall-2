import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { StatusBadge } from "@/components/ui/Badge";
import { SHIPPING_METHOD_LABELS } from "@/lib/constants";
import { getActiveDestinationCountries } from "@/lib/services/destinationCountryService";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Shipments" };
export const dynamic = "force-dynamic";

export default async function AdminShipmentsPage() {
  await requirePermission(PERMISSIONS.MANAGE_SHIPMENTS);
  const [shipments, countries] = await Promise.all([
    db.shipment.findMany({
      orderBy: { createdAt: "desc" },
      include: { packages: true },
    }),
    getActiveDestinationCountries(),
  ]);
  const countryNameByIso = new Map(countries.map((c) => [c.isoCode, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-navy-900">Shipments</h1>
        <Link href="/admin/shipments/new" className="btn-primary btn-sm">Create Shipment</Link>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Tracking Number</th>
              <th className="p-3">Method</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Packages</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {shipments.map((s) => (
              <tr key={s.id}>
                <td className="p-3">
                  <Link href={`/admin/shipments/${s.id}`} className="font-medium text-atgblue-600">{s.trackingNumber}</Link>
                </td>
                <td className="p-3 text-navy-500">{SHIPPING_METHOD_LABELS[s.method]}</td>
                <td className="p-3 text-navy-500">{countryNameByIso.get(s.destinationCountryIso) ?? s.destinationCountryIso}{s.destinationCity ? `, ${s.destinationCity}` : ""}</td>
                <td className="p-3 text-navy-500">{s.packages.length}</td>
                <td className="p-3"><StatusBadge status={s.status} /></td>
                <td className="p-3 text-navy-400">{formatDate(s.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
