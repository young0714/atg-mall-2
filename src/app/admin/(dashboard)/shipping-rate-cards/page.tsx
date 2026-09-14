import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Form";
import { createRateCardAction, toggleRateCardActiveAction } from "./actions";
import Link from "next/link";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "Admin — Shipping Rate Cards" };
export const dynamic = "force-dynamic";

export default async function AdminShippingRateCardsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);

  const [cards, origins, destinations, serviceLevels, carriers] = await Promise.all([
    db.shippingRateCard.findMany({
      include: { shippingOrigin: true, destinationCountry: true, serviceLevel: true, carrier: true, brackets: true },
      orderBy: [{ shippingOrigin: { name: "asc" } }, { destinationCountry: { name: "asc" } }],
    }),
    db.shippingOrigin.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.destinationCountry.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.shippingServiceLevel.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.carrier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Shipping Rate Cards</h1>
        <p className="text-sm text-navy-500">
          One row per Origin → Destination (+ optional region) → Service Level lane. Weight-bracket pricing is
          managed on each card's own page after creating it here.
        </p>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Rate card saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-navy-900">+ Add Rate Card</summary>
        <form action={createRateCardAction} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Origin" htmlFor="shippingOriginId" required>
            <Select id="shippingOriginId" name="shippingOriginId" required>
              <option value="">— Select —</option>
              {origins.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </Select>
          </Field>
          <Field label="Destination country" htmlFor="destinationCountryId" required>
            <Select id="destinationCountryId" name="destinationCountryId" required>
              <option value="">— Select —</option>
              {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Destination region" htmlFor="destinationRegion" hint="Optional sub-national region; leave blank for all regions of the country">
            <Input id="destinationRegion" name="destinationRegion" />
          </Field>
          <Field label="Service level" htmlFor="serviceLevelId" required>
            <Select id="serviceLevelId" name="serviceLevelId" required>
              <option value="">— Select —</option>
              {serviceLevels.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Carrier" htmlFor="carrierId" required>
            <Select id="carrierId" name="carrierId" required>
              <option value="">— Select —</option>
              {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Currency" htmlFor="currency" required hint='3 letters, e.g. "USD"'>
            <Input id="currency" name="currency" maxLength={3} defaultValue="USD" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min days" htmlFor="deliveryDaysMin" required><Input id="deliveryDaysMin" name="deliveryDaysMin" type="number" required /></Field>
            <Field label="Max days" htmlFor="deliveryDaysMax" required><Input id="deliveryDaysMax" name="deliveryDaysMax" type="number" required /></Field>
          </div>
          <Field label="Markup" htmlFor="markupOverride" hint="Inherit uses the global default set in Global Settings">
            <Select id="markupOverride" name="markupOverride" defaultValue="INHERIT">
              <option value="INHERIT">Inherit global default</option>
              <option value="ENABLED">Enabled for this card</option>
              <option value="DISABLED">Disabled for this card</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="trackingAvailable" value="true" defaultChecked /> Tracking available
          </label>
          <Field label="Markup % override" htmlFor="markupPercent" hint="Leave blank to inherit">
            <Input id="markupPercent" name="markupPercent" type="number" />
          </Field>
          <Field label="Fixed markup override (minor units)" htmlFor="markupFixedMinor" hint="Leave blank to inherit">
            <Input id="markupFixedMinor" name="markupFixedMinor" type="number" />
          </Field>
          <Field label="Handling fee override (minor units)" htmlFor="handlingFeeMinor" hint="Leave blank to inherit">
            <Input id="handlingFeeMinor" name="handlingFeeMinor" type="number" />
          </Field>
          <Field label="Notes" htmlFor="notes" hint="Optional internal note">
            <Input id="notes" name="notes" />
          </Field>
          <SubmitButton className="btn-primary sm:col-span-2 sm:w-fit">Create Rate Card</SubmitButton>
        </form>
      </details>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Origin</th>
              <th className="p-3">Destination</th>
              <th className="p-3">Region</th>
              <th className="p-3">Service level</th>
              <th className="p-3">Carrier</th>
              <th className="p-3">Brackets</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {cards.map((c) => (
              <tr key={c.id}>
                <td className="p-3 text-navy-500">{c.shippingOrigin.name}</td>
                <td className="p-3 font-medium text-navy-800">{c.destinationCountry.name}</td>
                <td className="p-3 text-navy-500">{c.destinationRegion ?? "All regions"}</td>
                <td className="p-3 text-navy-500">{c.serviceLevel.name}</td>
                <td className="p-3 text-navy-500">{c.carrier.name}</td>
                <td className="p-3">
                  <Badge tone={c.brackets.length > 0 ? "blue" : "gold"}>{c.brackets.length} bracket{c.brackets.length === 1 ? "" : "s"}</Badge>
                </td>
                <td className="p-3"><Badge tone={c.isActive ? "green" : "neutral"}>{c.isActive ? "Active" : "Inactive"}</Badge></td>
                <td className="space-x-2 p-3 text-right">
                  <Link href={`/admin/shipping-rate-cards/${c.id}`} className="text-xs font-medium text-atgblue-600 hover:underline">Edit</Link>
                  <form action={toggleRateCardActiveAction} className="inline">
                    <input type="hidden" name="cardId" value={c.id} />
                    <SubmitButton className="text-xs font-medium text-atgblue-600 hover:underline">{c.isActive ? "Deactivate" : "Activate"}</SubmitButton>
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
