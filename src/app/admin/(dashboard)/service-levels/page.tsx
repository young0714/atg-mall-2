import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Form";
import { createServiceLevelAction, toggleServiceLevelActiveAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Service Levels" };
export const dynamic = "force-dynamic";

export default async function AdminServiceLevelsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const levels = await db.shippingServiceLevel.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Service Levels</h1>
        <p className="text-sm text-navy-500">
          Customer-facing checkout pricing tiers (Economy / Standard / Express). Not the same as a warehouse's
          physical freight mode — a service level's actual price and carrier are set per lane on a Rate Card.
        </p>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Service level saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-navy-900">+ Add Service Level</summary>
        <form action={createServiceLevelAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" required hint='e.g. "Express"'><Input id="name" name="name" required /></Field>
          <Field label="Sort order" htmlFor="sortOrder" required hint="Lower shows first at checkout">
            <Input id="sortOrder" name="sortOrder" type="number" defaultValue={0} required />
          </Field>
          <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Add Service Level</button>
        </form>
      </details>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Sort order</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {levels.map((l) => (
              <tr key={l.id}>
                <td className="p-3 font-medium text-navy-800">{l.name}</td>
                <td className="p-3 text-navy-500">{l.sortOrder}</td>
                <td className="p-3"><Badge tone={l.isActive ? "green" : "neutral"}>{l.isActive ? "Active" : "Inactive"}</Badge></td>
                <td className="p-3">
                  <form action={toggleServiceLevelActiveAction}>
                    <input type="hidden" name="levelId" value={l.id} />
                    <button className="text-xs font-medium text-atgblue-600 hover:underline">{l.isActive ? "Deactivate" : "Activate"}</button>
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
