import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Form";
import { createShippingOriginAction, toggleShippingOriginActiveAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Shipping Origins" };
export const dynamic = "force-dynamic";

export default async function AdminShippingOriginsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const origins = await db.shippingOrigin.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Shipping Origins</h1>
        <p className="text-sm text-navy-500">
          Warehouse/sourcing origins the shipping calculator quotes from — e.g. "China Warehouse", "USA Warehouse".
          Every product must have one of these assigned for accurate shipping quotes.
        </p>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Origin saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-navy-900">+ Add Shipping Origin</summary>
        <form action={createShippingOriginAction} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" required hint='e.g. "USA Warehouse"'><Input id="name" name="name" required /></Field>
          <Field label="Country ISO code" htmlFor="countryIso" required hint='2 letters, e.g. "US"'>
            <Input id="countryIso" name="countryIso" maxLength={2} required />
          </Field>
          <Field label="City" htmlFor="city" hint="Optional">
            <Input id="city" name="city" />
          </Field>
          <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Add Origin</button>
        </form>
      </details>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">ISO</th>
              <th className="p-3">City</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {origins.map((o) => (
              <tr key={o.id}>
                <td className="p-3 font-medium text-navy-800">{o.name}</td>
                <td className="p-3 text-navy-500">{o.countryIso}</td>
                <td className="p-3 text-navy-500">{o.city ?? "—"}</td>
                <td className="p-3"><Badge tone={o.isActive ? "green" : "neutral"}>{o.isActive ? "Active" : "Inactive"}</Badge></td>
                <td className="p-3">
                  <form action={toggleShippingOriginActiveAction}>
                    <input type="hidden" name="originId" value={o.id} />
                    <button className="text-xs font-medium text-atgblue-600 hover:underline">{o.isActive ? "Deactivate" : "Activate"}</button>
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
