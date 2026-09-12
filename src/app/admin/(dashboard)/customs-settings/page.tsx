import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Form";
import { upsertCustomsSettingAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Customs Settings" };
export const dynamic = "force-dynamic";

export default async function AdminCustomsSettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const countries = await db.destinationCountry.findMany({
    where: { isActive: true },
    include: { customsSetting: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Customs Settings</h1>
        <p className="text-sm text-navy-500">
          Optional, per-country duty/tax estimates shown alongside a shipping quote. Every quote always shows the
          customs disclaimer regardless of what's set here — this only adds an estimate on top of it, never a
          guarantee. Leave "Configured" unchecked if you don't have reliable numbers yet.
        </p>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Customs setting saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <div className="space-y-4">
        {countries.map((c) => (
          <details key={c.id} className="card p-5">
            <summary className="cursor-pointer font-semibold text-navy-900">
              {c.name} ({c.isoCode}){" "}
              <Badge tone={c.customsSetting?.isConfigured ? "green" : "neutral"} className="ml-2">
                {c.customsSetting?.isConfigured ? "Configured" : "Not configured"}
              </Badge>
            </summary>
            <form action={upsertCustomsSettingAction} className="mt-4 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="destinationCountryId" value={c.id} />
              <Field label="Estimated duty %" htmlFor={`duty-${c.id}`}>
                <Input id={`duty-${c.id}`} name="estimatedDutyPercent" type="number" defaultValue={c.customsSetting?.estimatedDutyPercent ?? undefined} />
              </Field>
              <Field label="Import tax %" htmlFor={`tax-${c.id}`}>
                <Input id={`tax-${c.id}`} name="importTaxPercent" type="number" defaultValue={c.customsSetting?.importTaxPercent ?? undefined} />
              </Field>
              <Field label="Processing fee (minor units)" htmlFor={`fee-${c.id}`}>
                <Input id={`fee-${c.id}`} name="customsProcessingFeeMinor" type="number" defaultValue={c.customsSetting?.customsProcessingFeeMinor ?? undefined} />
              </Field>
              <Field label="Fee currency" htmlFor={`cur-${c.id}`}>
                <Select id={`cur-${c.id}`} name="currency" defaultValue={c.customsSetting?.currency ?? ""}>
                  <option value="">—</option>
                  <option value="USD">USD</option>
                  <option value="NGN">NGN</option>
                  <option value="GMD">GMD</option>
                </Select>
              </Field>
              <Field label="Notes" htmlFor={`notes-${c.id}`}>
                <Input id={`notes-${c.id}`} name="notes" defaultValue={c.customsSetting?.notes ?? undefined} />
              </Field>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="isConfigured" value="true" defaultChecked={c.customsSetting?.isConfigured ?? false} /> Mark as configured (shown as an estimate to customers)
              </label>
              <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Save</button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
