import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Form";
import { createCarrierAction, toggleCarrierActiveAction } from "./actions";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Carriers" };
export const dynamic = "force-dynamic";

export default async function AdminCarriersPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const carriers = await db.carrier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { rateCards: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Carriers</h1>
        <p className="text-sm text-navy-500">
          "Manual Rate" is always present and backs every admin-configured rate card. Real carrier APIs (DHL, FedEx,
          etc.) can be added here, but only take effect once a matching live integration is built and its provider
          reports as configured — until then, "Live API enabled" is informational only.
        </p>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Carrier saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-navy-900">+ Add Carrier</summary>
        <form action={createCarrierAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" required hint='e.g. "DHL Express"'><Input id="name" name="name" required /></Field>
          <Field label="Code" htmlFor="code" required hint='Short unique code, e.g. "DHL"'>
            <Input id="code" name="code" required />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="isLiveApiEnabled" value="true" /> Live API enabled (informational until integrated)
          </label>
          <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Add Carrier</button>
        </form>
      </details>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Code</th>
              <th className="p-3">Live API</th>
              <th className="p-3">Status</th>
              <th className="p-3">Lanes</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {carriers.map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-medium text-navy-800">{c.name}</td>
                <td className="p-3 text-navy-500">{c.code}</td>
                <td className="p-3"><Badge tone={c.isLiveApiEnabled ? "blue" : "neutral"}>{c.isLiveApiEnabled ? "Enabled" : "Manual only"}</Badge></td>
                <td className="p-3"><Badge tone={c.isActive ? "green" : "neutral"}>{c.isActive ? "Active" : "Inactive"}</Badge></td>
                <td className="p-3 text-navy-500">{c._count.rateCards}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/admin/carriers/${c.id}/rates`} className="text-xs font-medium text-atgblue-600 hover:underline">
                      Edit rates
                    </Link>
                    <form action={toggleCarrierActiveAction}>
                      <input type="hidden" name="carrierId" value={c.id} />
                      <button className="text-xs font-medium text-atgblue-600 hover:underline">{c.isActive ? "Deactivate" : "Activate"}</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
