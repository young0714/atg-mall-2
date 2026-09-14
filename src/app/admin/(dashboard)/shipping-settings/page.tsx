import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Field, Input } from "@/components/ui/Form";
import { updateShippingGlobalSettingsAction } from "./actions";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "Admin — Shipping Settings" };
export const dynamic = "force-dynamic";

export default async function AdminShippingSettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);
  const settings = await db.shippingGlobalSettings.findFirst();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Shipping Engine — Global Settings</h1>
        <p className="text-sm text-navy-500">
          Defaults used whenever an individual rate card doesn't override them. Changing these affects every future
          quote immediately — historical orders keep their own snapshotted values and are never recalculated.
        </p>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Settings saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <form action={updateShippingGlobalSettingsAction} className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <Field label="Volumetric divisor" htmlFor="volumetricDivisor" required hint="cm³ ÷ divisor = volumetric kg. Industry standard is 5000 for air freight.">
          <Input id="volumetricDivisor" name="volumetricDivisor" type="number" defaultValue={settings?.volumetricDivisor ?? 5000} required />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="markupEnabled" value="true" defaultChecked={settings?.markupEnabled ?? true} /> Markup enabled by default
        </label>
        <Field label="Default markup %" htmlFor="defaultMarkupPercent" required>
          <Input id="defaultMarkupPercent" name="defaultMarkupPercent" type="number" defaultValue={settings?.defaultMarkupPercent ?? 0} required />
        </Field>
        <Field label="Default fixed markup (minor units)" htmlFor="defaultMarkupFixedMinor" required hint="e.g. 200 = $2.00">
          <Input id="defaultMarkupFixedMinor" name="defaultMarkupFixedMinor" type="number" defaultValue={settings?.defaultMarkupFixedMinor ?? 0} required />
        </Field>
        <Field label="Default handling fee (minor units)" htmlFor="defaultHandlingFeeMinor" required>
          <Input id="defaultHandlingFeeMinor" name="defaultHandlingFeeMinor" type="number" defaultValue={settings?.defaultHandlingFeeMinor ?? 0} required />
        </Field>
        <SubmitButton className="btn-primary sm:col-span-2 sm:w-fit">Save Settings</SubmitButton>
      </form>
    </div>
  );
}
