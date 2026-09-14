import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Form";
import { upsertCurrencyRateAction, toggleCurrencyRateActiveAction } from "./actions";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "Admin — Currency Rates" };
export const dynamic = "force-dynamic";

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

export default async function AdminCurrencyRatesPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const rates = await db.currencyRate.findMany({ orderBy: [{ fromCurrency: "asc" }, { toCurrency: "asc" }] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Currency Rates</h1>
        <p className="text-sm text-navy-500">
          Exchange rates the shipping engine uses to convert rate-card prices into the customer's order currency.
          A rate older than 7 days is flagged stale — update it regularly. Not the same as the legacy static wallet
          conversion table.
        </p>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Rate saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-navy-900">+ Add / Update Rate</summary>
        <form action={upsertCurrencyRateAction} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="From currency" htmlFor="fromCurrency" required hint='3 letters, e.g. "USD"'>
            <Input id="fromCurrency" name="fromCurrency" maxLength={3} required />
          </Field>
          <Field label="To currency" htmlFor="toCurrency" required hint='3 letters, e.g. "NGN"'>
            <Input id="toCurrency" name="toCurrency" maxLength={3} required />
          </Field>
          <Field label="Rate" htmlFor="rate" required hint="Units of 'to' per 1 unit of 'from'">
            <Input id="rate" name="rate" type="number" step="0.0001" required />
          </Field>
          <SubmitButton className="btn-primary sm:col-span-3 sm:w-fit">Save Rate</SubmitButton>
        </form>
      </details>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">From</th>
              <th className="p-3">To</th>
              <th className="p-3">Rate</th>
              <th className="p-3">Source</th>
              <th className="p-3">Fetched</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {rates.map((r) => {
              const isStale = Date.now() - r.fetchedAt.getTime() > STALE_MS;
              return (
                <tr key={r.id}>
                  <td className="p-3 font-medium text-navy-800">{r.fromCurrency}</td>
                  <td className="p-3 text-navy-500">{r.toCurrency}</td>
                  <td className="p-3 text-navy-500">{r.rate}</td>
                  <td className="p-3 text-navy-500">{r.source}</td>
                  <td className="p-3 text-navy-500">
                    {r.fetchedAt.toLocaleDateString()} {isStale && <Badge tone="gold" className="ml-1">Stale</Badge>}
                  </td>
                  <td className="p-3"><Badge tone={r.isActive ? "green" : "neutral"}>{r.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="p-3">
                    <form action={toggleCurrencyRateActiveAction}>
                      <input type="hidden" name="rateId" value={r.id} />
                      <SubmitButton className="text-xs font-medium text-atgblue-600 hover:underline">{r.isActive ? "Deactivate" : "Activate"}</SubmitButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
