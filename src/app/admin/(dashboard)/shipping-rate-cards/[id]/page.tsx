import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { notFound } from "next/navigation";
import { Field, Input, Select } from "@/components/ui/Form";
import { formatMoney } from "@/lib/money";
import Link from "next/link";
import type { Metadata } from "next";
import { updateRateCardAction, addRateBracketAction, updateRateBracketAction, deleteRateBracketAction } from "./actions";

export const metadata: Metadata = { title: "Admin — Edit Rate Card" };
export const dynamic = "force-dynamic";

export default async function AdminRateCardDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);

  const [card, origins, destinations, serviceLevels, carriers] = await Promise.all([
    db.shippingRateCard.findUnique({
      where: { id: params.id },
      include: {
        shippingOrigin: true,
        destinationCountry: true,
        serviceLevel: true,
        carrier: true,
        brackets: { orderBy: { minGrams: "asc" } },
      },
    }),
    db.shippingOrigin.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.destinationCountry.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.shippingServiceLevel.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.carrier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  if (!card) notFound();

  const markupOverride = card.markupEnabled === null ? "INHERIT" : card.markupEnabled ? "ENABLED" : "DISABLED";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/shipping-rate-cards" className="text-xs font-medium text-atgblue-600 hover:underline">
          ← Back to rate cards
        </Link>
        <h1 className="mt-1 text-2xl font-display font-bold text-navy-900">
          {card.shippingOrigin.name} → {card.destinationCountry.name}
          {card.destinationRegion ? ` (${card.destinationRegion})` : ""} — {card.serviceLevel.name}
        </h1>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Lane details</h2>
        <form action={updateRateCardAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="hidden" name="cardId" value={card.id} />
          <Field label="Origin" htmlFor="shippingOriginId" required>
            <Select id="shippingOriginId" name="shippingOriginId" defaultValue={card.shippingOriginId} required>
              {origins.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </Select>
          </Field>
          <Field label="Destination country" htmlFor="destinationCountryId" required>
            <Select id="destinationCountryId" name="destinationCountryId" defaultValue={card.destinationCountryId} required>
              {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Destination region" htmlFor="destinationRegion" hint="Optional; leave blank for all regions">
            <Input id="destinationRegion" name="destinationRegion" defaultValue={card.destinationRegion ?? ""} />
          </Field>
          <Field label="Service level" htmlFor="serviceLevelId" required>
            <Select id="serviceLevelId" name="serviceLevelId" defaultValue={card.serviceLevelId} required>
              {serviceLevels.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Carrier" htmlFor="carrierId" required>
            <Select id="carrierId" name="carrierId" defaultValue={card.carrierId} required>
              {carriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Currency" htmlFor="currency" required>
            <Input id="currency" name="currency" maxLength={3} defaultValue={card.currency} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min days" htmlFor="deliveryDaysMin" required><Input id="deliveryDaysMin" name="deliveryDaysMin" type="number" defaultValue={card.deliveryDaysMin} required /></Field>
            <Field label="Max days" htmlFor="deliveryDaysMax" required><Input id="deliveryDaysMax" name="deliveryDaysMax" type="number" defaultValue={card.deliveryDaysMax} required /></Field>
          </div>
          <Field label="Markup" htmlFor="markupOverride">
            <Select id="markupOverride" name="markupOverride" defaultValue={markupOverride}>
              <option value="INHERIT">Inherit global default</option>
              <option value="ENABLED">Enabled for this card</option>
              <option value="DISABLED">Disabled for this card</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="trackingAvailable" value="true" defaultChecked={card.trackingAvailable} /> Tracking available
          </label>
          <Field label="Markup % override" htmlFor="markupPercent" hint="Leave blank to inherit">
            <Input id="markupPercent" name="markupPercent" type="number" defaultValue={card.markupPercent ?? ""} />
          </Field>
          <Field label="Fixed markup override (minor units)" htmlFor="markupFixedMinor" hint="Leave blank to inherit">
            <Input id="markupFixedMinor" name="markupFixedMinor" type="number" defaultValue={card.markupFixedMinor ?? ""} />
          </Field>
          <Field label="Handling fee override (minor units)" htmlFor="handlingFeeMinor" hint="Leave blank to inherit">
            <Input id="handlingFeeMinor" name="handlingFeeMinor" type="number" defaultValue={card.handlingFeeMinor ?? ""} />
          </Field>
          <Field label="Notes" htmlFor="notes">
            <Input id="notes" name="notes" defaultValue={card.notes ?? ""} />
          </Field>
          <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Save changes</button>
        </form>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Weight brackets ({card.brackets.length})</h2>
        <p className="text-xs text-navy-500">
          The calculator picks the first bracket whose range covers the chargeable weight (MAX of actual and
          volumetric). Leave "Max weight" blank on your heaviest bracket to make it open-ended.
        </p>
        {card.brackets.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
                <tr>
                  <th className="p-2">Min (g)</th>
                  <th className="p-2">Max (g)</th>
                  <th className="p-2">Base price</th>
                  <th className="p-2">Price/kg</th>
                  <th className="p-2">Min charge</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {card.brackets.map((b) => (
                  <tr key={b.id}>
                    <td colSpan={6} className="p-2">
                      <form action={updateRateBracketAction} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="cardId" value={card.id} />
                        <input type="hidden" name="bracketId" value={b.id} />
                        <Field label="Min (g)" htmlFor={`minGrams-${b.id}`}>
                          <Input id={`minGrams-${b.id}`} name="minGrams" type="number" defaultValue={b.minGrams} className="w-20" required />
                        </Field>
                        <Field label="Max (g)" htmlFor={`maxGrams-${b.id}`} hint="Blank = ∞">
                          <Input id={`maxGrams-${b.id}`} name="maxGrams" type="number" defaultValue={b.maxGrams ?? ""} className="w-20" />
                        </Field>
                        <Field label={`Base (minor, ${card.currency})`} htmlFor={`basePriceMinor-${b.id}`}>
                          <Input id={`basePriceMinor-${b.id}`} name="basePriceMinor" type="number" defaultValue={b.basePriceMinor} className="w-24" required />
                        </Field>
                        <Field label="Per kg (minor)" htmlFor={`pricePerKgMinor-${b.id}`}>
                          <Input id={`pricePerKgMinor-${b.id}`} name="pricePerKgMinor" type="number" defaultValue={b.pricePerKgMinor} className="w-24" required />
                        </Field>
                        <Field label="Min charge (minor)" htmlFor={`minChargeMinor-${b.id}`}>
                          <Input id={`minChargeMinor-${b.id}`} name="minChargeMinor" type="number" defaultValue={b.minChargeMinor} className="w-24" required />
                        </Field>
                        <button type="submit" className="btn-primary btn-sm">Save</button>
                        <span className="text-xs text-navy-400">
                          (currently {formatMoney(b.basePriceMinor, card.currency as never)} + {formatMoney(b.pricePerKgMinor, card.currency as never)}/kg, min {formatMoney(b.minChargeMinor, card.currency as never)})
                        </span>
                      </form>
                      <form action={deleteRateBracketAction} className="mt-1">
                        <input type="hidden" name="cardId" value={card.id} />
                        <input type="hidden" name="bracketId" value={b.id} />
                        <button className="text-xs font-medium text-red-600 hover:underline">Delete this bracket</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <details>
          <summary className="cursor-pointer text-sm font-medium text-atgblue-600">+ Add bracket</summary>
          <form action={addRateBracketAction} className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <input type="hidden" name="cardId" value={card.id} />
            <Field label="Min weight (g)" htmlFor="minGrams" required><Input id="minGrams" name="minGrams" type="number" defaultValue={0} required /></Field>
            <Field label="Max weight (g)" htmlFor="maxGrams" hint="Leave blank for open-ended"><Input id="maxGrams" name="maxGrams" type="number" /></Field>
            <Field label="Base price (minor units)" htmlFor="basePriceMinor" required><Input id="basePriceMinor" name="basePriceMinor" type="number" defaultValue={0} required /></Field>
            <Field label="Price per kg (minor units)" htmlFor="pricePerKgMinor" required><Input id="pricePerKgMinor" name="pricePerKgMinor" type="number" defaultValue={0} required /></Field>
            <Field label="Min charge (minor units)" htmlFor="minChargeMinor" required><Input id="minChargeMinor" name="minChargeMinor" type="number" defaultValue={0} required /></Field>
            <button type="submit" className="btn-primary sm:col-span-3 sm:w-fit">Add bracket</button>
          </form>
        </details>
      </section>
    </div>
  );
}
