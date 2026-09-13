import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { notFound } from "next/navigation";
import { Field, Input } from "@/components/ui/Form";
import { formatMoney } from "@/lib/money";
import Link from "next/link";
import type { Metadata } from "next";
import { bulkUpdateCarrierRatesAction } from "./actions";

export const metadata: Metadata = { title: "Admin — Carrier Rates" };
export const dynamic = "force-dynamic";

export default async function AdminCarrierRatesPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);

  const carrier = await db.carrier.findUnique({ where: { id: params.id } });
  if (!carrier) notFound();

  const cards = await db.shippingRateCard.findMany({
    where: { carrierId: params.id },
    include: { shippingOrigin: true, destinationCountry: true, serviceLevel: true, brackets: { orderBy: { minGrams: "asc" } } },
    orderBy: [{ shippingOrigin: { name: "asc" } }, { destinationCountry: { name: "asc" } }],
  });

  const sample = cards[0]?.brackets[0];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/carriers" className="text-xs font-medium text-atgblue-600 hover:underline">
          ← Back to carriers
        </Link>
        <h1 className="mt-1 text-2xl font-display font-bold text-navy-900">{carrier.name} rates</h1>
        <p className="text-sm text-navy-500">
          {cards.length} lane{cards.length === 1 ? "" : "s"} configured. Until you're ready to connect a live rate
          API, this is where you set what {carrier.name} charges — no code changes needed.
        </p>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Rates updated across all lanes.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Set one rate for every lane</h2>
        <p className="text-xs text-navy-500">
          Applies the same base price, per-kg rate, minimum charge, delivery window and currency to all{" "}
          {cards.length} of {carrier.name}&apos;s lanes at once. Need one lane to be different? Edit it individually
          from the table below instead.
        </p>
        <form action={bulkUpdateCarrierRatesAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <input type="hidden" name="carrierId" value={carrier.id} />
          <Field label="Currency" htmlFor="currency" required>
            <Input id="currency" name="currency" maxLength={3} defaultValue={cards[0]?.currency ?? "USD"} required />
          </Field>
          <Field label="Base price (minor units)" htmlFor="basePriceMinor" required hint="e.g. 1500 = $15.00">
            <Input id="basePriceMinor" name="basePriceMinor" type="number" defaultValue={sample?.basePriceMinor ?? 0} required />
          </Field>
          <Field label="Price per kg (minor units)" htmlFor="pricePerKgMinor" required>
            <Input id="pricePerKgMinor" name="pricePerKgMinor" type="number" defaultValue={sample?.pricePerKgMinor ?? 0} required />
          </Field>
          <Field label="Minimum charge (minor units)" htmlFor="minChargeMinor" required>
            <Input id="minChargeMinor" name="minChargeMinor" type="number" defaultValue={sample?.minChargeMinor ?? 0} required />
          </Field>
          <Field label="Min delivery days" htmlFor="deliveryDaysMin" required>
            <Input id="deliveryDaysMin" name="deliveryDaysMin" type="number" defaultValue={cards[0]?.deliveryDaysMin ?? 3} required />
          </Field>
          <Field label="Max delivery days" htmlFor="deliveryDaysMax" required>
            <Input id="deliveryDaysMax" name="deliveryDaysMax" type="number" defaultValue={cards[0]?.deliveryDaysMax ?? 5} required />
          </Field>
          <button type="submit" className="btn-primary sm:col-span-3 sm:w-fit">
            Apply to all {cards.length} lanes
          </button>
        </form>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Lanes</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
              <tr>
                <th className="p-2">Origin</th>
                <th className="p-2">Destination</th>
                <th className="p-2">Service level</th>
                <th className="p-2">Current rate</th>
                <th className="p-2">Days</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {cards.map((c) => {
                const b = c.brackets[0];
                return (
                  <tr key={c.id}>
                    <td className="p-2 text-navy-500">{c.shippingOrigin.name}</td>
                    <td className="p-2 text-navy-500">{c.destinationCountry.name}</td>
                    <td className="p-2 text-navy-500">{c.serviceLevel.name}</td>
                    <td className="p-2 text-navy-500">
                      {b ? `${formatMoney(b.basePriceMinor, c.currency as never)} + ${formatMoney(b.pricePerKgMinor, c.currency as never)}/kg` : "—"}
                    </td>
                    <td className="p-2 text-navy-500">{c.deliveryDaysMin}–{c.deliveryDaysMax}</td>
                    <td className="p-2 text-right">
                      <Link href={`/admin/shipping-rate-cards/${c.id}`} className="text-xs font-medium text-atgblue-600 hover:underline">
                        Edit individually
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {cards.length === 0 && (
          <p className="text-sm text-navy-400">
            No lanes configured for this carrier yet — create one from{" "}
            <Link href="/admin/shipping-rate-cards" className="text-atgblue-600 hover:underline">Shipping Rate Cards</Link>.
          </p>
        )}
      </section>
    </div>
  );
}
