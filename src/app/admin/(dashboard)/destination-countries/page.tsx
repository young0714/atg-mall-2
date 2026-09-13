import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Form";
import { createDestinationCountryAction, toggleDestinationCountryActiveAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Destination Countries" };
export const dynamic = "force-dynamic";

export default async function AdminDestinationCountriesPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const countries = await db.destinationCountry.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Destination Countries</h1>
        <p className="text-sm text-navy-500">
          The open-ended country list the shipping calculator and rate cards quote to. Not limited to Gambia/Nigeria —
          add any country ATG ships to. This is separate from customer account countries.
        </p>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Country saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-navy-900">+ Add Destination Country</summary>
        <form action={createDestinationCountryAction} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" required hint='e.g. "Ghana"'><Input id="name" name="name" required /></Field>
          <Field label="ISO code" htmlFor="isoCode" required hint='2 letters, e.g. "GH"'>
            <Input id="isoCode" name="isoCode" maxLength={2} required />
          </Field>
          <Field label="Region" htmlFor="region" hint='Optional, e.g. "West Africa"'>
            <Input id="region" name="region" />
          </Field>
          <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Add Country</button>
        </form>
      </details>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">ISO</th>
              <th className="p-3">Region</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {countries.map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-medium text-navy-800">{c.name}</td>
                <td className="p-3 text-navy-500">{c.isoCode}</td>
                <td className="p-3 text-navy-500">{c.region ?? "—"}</td>
                <td className="p-3"><Badge tone={c.isActive ? "green" : "neutral"}>{c.isActive ? "Active" : "Inactive"}</Badge></td>
                <td className="p-3">
                  <form action={toggleDestinationCountryActiveAction}>
                    <input type="hidden" name="countryId" value={c.id} />
                    <button className="text-xs font-medium text-atgblue-600 hover:underline">{c.isActive ? "Deactivate" : "Activate"}</button>
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
