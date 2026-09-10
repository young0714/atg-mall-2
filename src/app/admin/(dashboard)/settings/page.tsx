import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Form";
import { formatMoney } from "@/lib/money";
import { COUNTRY_LABELS, COUNTRY_FLAGS } from "@/lib/constants";
import {
  upsertDeliveryZoneAction,
  toggleDeliveryZoneActiveAction,
  deleteDeliveryZoneAction,
} from "./actions";
import type { Metadata } from "next";
import type { Country } from "@prisma/client";

export const metadata: Metadata = { title: "Admin — Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SETTINGS);
  const zones = await db.deliveryZone.findMany({ orderBy: [{ country: "asc" }, { city: "asc" }] });

  const byCountry: Record<Country, typeof zones> = { NIGERIA: [], GAMBIA: [] };
  for (const z of zones) byCountry[z.country].push(z);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Settings</h1>
        <p className="text-sm text-navy-500">
          Configure the local delivery zones ATG Mall serves. Only Super Admins can change these.
        </p>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Delivery zone saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <section className="card p-5">
        <h2 className="mb-4 font-semibold text-navy-900">Delivery Zones</h2>

        <details className="rounded-lg border border-navy-100 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-navy-900">+ Add / Update Zone</summary>
          <form action={upsertDeliveryZoneAction} className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Country" htmlFor="country" required>
              <Select id="country" name="country" required>
                <option value="NIGERIA">Nigeria</option>
                <option value="GAMBIA">Gambia</option>
              </Select>
            </Field>
            <Field label="City" htmlFor="city" required hint="Matches an existing zone if the country+city already exist">
              <Input id="city" name="city" required />
            </Field>
            <Field label="Currency" htmlFor="currency" required>
              <Select id="currency" name="currency" required>
                <option value="NGN">NGN</option>
                <option value="GMD">GMD</option>
              </Select>
            </Field>
            <Field label="Local delivery fee (minor units)" htmlFor="localFeeMinor" required hint="e.g. 150000 = ₦1,500.00">
              <Input id="localFeeMinor" name="localFeeMinor" type="number" defaultValue={0} required />
            </Field>
            <Field label="Min ETA (days)" htmlFor="etaDaysMin" required>
              <Input id="etaDaysMin" name="etaDaysMin" type="number" defaultValue={1} required />
            </Field>
            <Field label="Max ETA (days)" htmlFor="etaDaysMax" required>
              <Input id="etaDaysMax" name="etaDaysMax" type="number" defaultValue={3} required />
            </Field>
            <button type="submit" className="btn-primary sm:col-span-3 sm:w-fit">Save Zone</button>
          </form>
        </details>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {(["NIGERIA", "GAMBIA"] as Country[]).map((country) => (
            <div key={country}>
              <h3 className="mb-2 text-sm font-semibold text-navy-800">
                {COUNTRY_FLAGS[country]} {COUNTRY_LABELS[country]}
              </h3>
              {byCountry[country].length === 0 ? (
                <p className="rounded-lg border border-dashed border-navy-200 p-4 text-sm text-navy-400">
                  No zones configured yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {byCountry[country].map((z) => (
                    <div key={z.id} className="flex items-center justify-between rounded-lg border border-navy-100 p-3 text-sm">
                      <div>
                        <p className="font-medium text-navy-800">{z.city}</p>
                        <p className="text-xs text-navy-400">
                          {formatMoney(z.localFeeMinor, z.currency)} delivery fee · {z.etaDaysMin}–{z.etaDaysMax} days
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge tone={z.isActive ? "green" : "neutral"}>{z.isActive ? "Active" : "Inactive"}</Badge>
                        <form action={toggleDeliveryZoneActiveAction}>
                          <input type="hidden" name="zoneId" value={z.id} />
                          <button className="text-xs font-medium text-atgblue-600 hover:underline">
                            {z.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                        <form action={deleteDeliveryZoneAction}>
                          <input type="hidden" name="zoneId" value={z.id} />
                          <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-2 font-semibold text-navy-900">Other Configuration</h2>
        <p className="text-sm text-navy-500">
          Currency conversion rates, payment provider credentials and notification channel settings are managed via
          environment variables for this MVP (see <code className="rounded bg-navy-50 px-1 py-0.5 text-xs">.env.example</code>),
          since they involve secrets or connect to future live integrations rather than day-to-day operational data. A
          dedicated admin UI for these can be added once a live payment/logistics provider is connected in Phase 2.
        </p>
      </section>
    </div>
  );
}
