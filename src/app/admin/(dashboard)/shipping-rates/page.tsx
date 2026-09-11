import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { formatMoney } from "@/lib/money";
import { upsertShippingRateAction, toggleShippingRateActiveAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Shipping Rates" };
export const dynamic = "force-dynamic";

export default async function AdminShippingRatesPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const rates = await db.shippingRate.findMany({ orderBy: [{ originCountry: "asc" }, { destinationCountry: "asc" }, { method: "asc" }] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Shipping Rates</h1>
        <p className="text-sm text-navy-500">
          Admin-managed per-kg rates used by the shipping calculator. These are not live carrier rates — set and update
          them here as ATG's actual freight agreements change.
        </p>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Rate saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-navy-900">+ Add / Update Rate</summary>
        <form action={upsertShippingRateAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Origin" htmlFor="originCountry" required>
            <Select id="originCountry" name="originCountry" defaultValue="China" required>
              <option value="China">🇨🇳 China</option>
              <option value="USA">🇺🇸 USA</option>
              <option value="UK">🇬🇧 UK</option>
            </Select>
          </Field>
          <Field label="Destination" htmlFor="destinationCountry" required>
            <Select id="destinationCountry" name="destinationCountry" required>
              <option value="NIGERIA">Nigeria</option>
              <option value="GAMBIA">Gambia</option>
            </Select>
          </Field>
          <Field label="Method" htmlFor="method" required>
            <Select id="method" name="method" required>
              <option value="AIR_FREIGHT">Air Freight</option>
              <option value="SEA_FREIGHT">Sea Freight</option>
              <option value="COURIER">Courier</option>
              <option value="LCL">LCL</option>
              <option value="FCL">FCL</option>
            </Select>
          </Field>
          <Field label="Price per kg (minor units)" htmlFor="pricePerKgMinor" required hint="e.g. 800 = $8.00/kg"><Input id="pricePerKgMinor" name="pricePerKgMinor" type="number" required /></Field>
          <Field label="Currency" htmlFor="currency" required>
            <Select id="currency" name="currency" defaultValue="USD" required>
              <option value="USD">USD</option>
              <option value="NGN">NGN</option>
              <option value="GMD">GMD</option>
            </Select>
          </Field>
          <Field label="Min chargeable weight (grams)" htmlFor="minChargeableWeightGrams" required><Input id="minChargeableWeightGrams" name="minChargeableWeightGrams" type="number" defaultValue={1000} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min days" htmlFor="estimatedDaysMin" required><Input id="estimatedDaysMin" name="estimatedDaysMin" type="number" required /></Field>
            <Field label="Max days" htmlFor="estimatedDaysMax" required><Input id="estimatedDaysMax" name="estimatedDaysMax" type="number" required /></Field>
          </div>
          <Field label="Notes" htmlFor="notes" hint="Optional internal note">
            <Textarea id="notes" name="notes" />
          </Field>
          <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Save Rate</button>
        </form>
      </details>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Origin</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Method</th>
              <th className="p-3">Rate</th>
              <th className="p-3">Min weight</th>
              <th className="p-3">Transit</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {rates.map((r) => (
              <tr key={r.id}>
                <td className="p-3 text-navy-500">{r.originCountry}</td>
                <td className="p-3 font-medium text-navy-800">{r.destinationCountry}</td>
                <td className="p-3 text-navy-500">{r.method.replaceAll("_", " ")}</td>
                <td className="p-3 text-navy-500">{formatMoney(r.pricePerKgMinor, r.currency)}/kg</td>
                <td className="p-3 text-navy-500">{(r.minChargeableWeightGrams / 1000).toFixed(1)}kg</td>
                <td className="p-3 text-navy-500">{r.estimatedDaysMin}–{r.estimatedDaysMax} days</td>
                <td className="p-3"><Badge tone={r.isActive ? "green" : "neutral"}>{r.isActive ? "Active" : "Inactive"}</Badge></td>
                <td className="p-3">
                  <form action={toggleShippingRateActiveAction}>
                    <input type="hidden" name="rateId" value={r.id} />
                    <button className="text-xs font-medium text-atgblue-600 hover:underline">{r.isActive ? "Deactivate" : "Activate"}</button>
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
