import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Form";
import { formatMoney } from "@/lib/money";
import { shippingCalculationService } from "@/lib/services/shipping/shippingCalculationService";
import { customsService } from "@/lib/services/shipping/customsService";
import type { Currency } from "@prisma/client";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "Admin — Shipping Test Quote" };
export const dynamic = "force-dynamic";

const CURRENCIES: Currency[] = ["USD", "NGN", "GMD", "CNY", "GBP", "EUR"];

export default async function AdminShippingTestQuotePage({
  searchParams,
}: {
  searchParams: {
    originIso?: string;
    destinationIso?: string;
    destinationRegion?: string;
    weightGrams?: string;
    lengthCm?: string;
    widthCm?: string;
    heightCm?: string;
    displayCurrency?: string;
  };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING_RATES);

  const [origins, destinations] = await Promise.all([
    db.shippingOrigin.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.destinationCountry.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const hasQuery = !!(searchParams.originIso && searchParams.destinationIso && searchParams.weightGrams);
  const displayCurrency = (searchParams.displayCurrency as Currency) || "USD";

  let quote: Awaited<ReturnType<typeof shippingCalculationService.getLaneQuote>> | null = null;
  let customs: Awaited<ReturnType<typeof customsService.getDisclosure>> | null = null;
  let quoteError: string | null = null;

  if (hasQuery) {
    try {
      const weightGrams = Number(searchParams.weightGrams);
      const lengthCm = searchParams.lengthCm ? Number(searchParams.lengthCm) : undefined;
      const widthCm = searchParams.widthCm ? Number(searchParams.widthCm) : undefined;
      const heightCm = searchParams.heightCm ? Number(searchParams.heightCm) : undefined;

      [quote, customs] = await Promise.all([
        shippingCalculationService.getLaneQuote({
          originIso: searchParams.originIso!,
          destinationIso: searchParams.destinationIso!,
          destinationRegion: searchParams.destinationRegion || undefined,
          package: { weightGrams, lengthCm, widthCm, heightCm },
          displayCurrency,
        }),
        customsService.getDisclosure(searchParams.destinationIso!),
      ]);
    } catch (err) {
      quoteError = err instanceof Error ? err.message : "Failed to compute quote.";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Shipping Test Quote</h1>
        <p className="text-sm text-navy-500">
          Runs a real quote through the shipping calculation service — the exact same code path checkout will use.
          Use this to verify a lane's rate cards before it goes live.
        </p>
      </div>

      <form method="GET" className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <Field label="Origin" htmlFor="originIso" required>
          <Select id="originIso" name="originIso" defaultValue={searchParams.originIso ?? ""} required>
            <option value="">— Select —</option>
            {origins.map((o) => <option key={o.id} value={o.countryIso}>{o.name} ({o.countryIso})</option>)}
          </Select>
        </Field>
        <Field label="Destination" htmlFor="destinationIso" required>
          <Select id="destinationIso" name="destinationIso" defaultValue={searchParams.destinationIso ?? ""} required>
            <option value="">— Select —</option>
            {destinations.map((d) => <option key={d.id} value={d.isoCode}>{d.name} ({d.isoCode})</option>)}
          </Select>
        </Field>
        <Field label="Destination region" htmlFor="destinationRegion" hint="Optional">
          <Input id="destinationRegion" name="destinationRegion" defaultValue={searchParams.destinationRegion ?? ""} />
        </Field>
        <Field label="Display currency" htmlFor="displayCurrency">
          <Select id="displayCurrency" name="displayCurrency" defaultValue={displayCurrency}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Weight (grams)" htmlFor="weightGrams" required hint="Actual product/package weight">
          <Input id="weightGrams" name="weightGrams" type="number" defaultValue={searchParams.weightGrams ?? ""} required />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Length (cm)" htmlFor="lengthCm" hint="Optional">
            <Input id="lengthCm" name="lengthCm" type="number" defaultValue={searchParams.lengthCm ?? ""} />
          </Field>
          <Field label="Width (cm)" htmlFor="widthCm" hint="Optional">
            <Input id="widthCm" name="widthCm" type="number" defaultValue={searchParams.widthCm ?? ""} />
          </Field>
          <Field label="Height (cm)" htmlFor="heightCm" hint="Optional">
            <Input id="heightCm" name="heightCm" type="number" defaultValue={searchParams.heightCm ?? ""} />
          </Field>
        </div>
        <SubmitButton className="btn-primary sm:col-span-2 sm:w-fit">Get Quote</SubmitButton>
      </form>

      {quoteError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{quoteError}</div>}

      {quote && (
        <section className="card space-y-4 p-5">
          <h2 className="font-semibold text-navy-900">
            {quote.originIso} → {quote.destinationIso}
          </h2>

          {quote.unavailableReason && (
            <div className="rounded-lg bg-gold-50 p-3 text-sm text-gold-800">{quote.unavailableReason}</div>
          )}

          {quote.options.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
                  <tr>
                    <th className="p-2">Service level</th>
                    <th className="p-2">Carrier</th>
                    <th className="p-2">Actual wt</th>
                    <th className="p-2">Volumetric wt</th>
                    <th className="p-2">Chargeable wt</th>
                    <th className="p-2">Carrier cost</th>
                    <th className="p-2">Markup</th>
                    <th className="p-2">Handling</th>
                    <th className="p-2">Customer price</th>
                    <th className="p-2">Delivery</th>
                    <th className="p-2">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {quote.options.map((o, i) => (
                    <tr key={i}>
                      <td className="p-2 font-medium text-navy-800">{o.serviceLevelName}</td>
                      <td className="p-2 text-navy-500">{o.carrierName}{!o.trackingAvailable && " (no tracking)"}</td>
                      <td className="p-2 text-navy-500">{o.actualWeightGrams}g</td>
                      <td className="p-2 text-navy-500">{o.volumetricWeightGrams}g</td>
                      <td className="p-2 font-medium text-navy-800">{o.chargeableWeightGrams}g</td>
                      <td className="p-2 text-navy-500">{formatMoney(o.displayCarrierCostMinor, o.displayCurrency)}</td>
                      <td className="p-2 text-navy-500">{formatMoney(o.displayMarkupMinor, o.displayCurrency)}</td>
                      <td className="p-2 text-navy-500">{formatMoney(o.displayHandlingFeeMinor, o.displayCurrency)}</td>
                      <td className="p-2 font-semibold text-navy-900">{formatMoney(o.displayCustomerPriceMinor, o.displayCurrency)}</td>
                      <td className="p-2 text-navy-500">{o.estimatedDeliveryDaysMin}–{o.estimatedDeliveryDaysMax} days</td>
                      <td className="p-2">
                        <Badge tone={o.rateSource === "MANUAL" ? "neutral" : o.rateSource === "LIVE_API" ? "green" : "gold"}>
                          {o.rateSource}
                        </Badge>
                        {o.isExchangeRateStale && <Badge tone="gold" className="ml-1">Stale FX</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {customs && (
            <div className="rounded-lg bg-navy-50 p-3 text-sm text-navy-700">
              <p className="font-medium">{customs.disclaimer}</p>
              {customs.isConfigured && (
                <p className="mt-1 text-navy-500">
                  Estimate: {customs.estimatedDutyPercent ?? 0}% duty, {customs.importTaxPercent ?? 0}% import tax
                  {customs.customsProcessingFeeMinor ? `, +${formatMoney(customs.customsProcessingFeeMinor, (customs.currency as Currency) ?? "USD")} processing fee` : ""}.
                  {customs.notes ? ` ${customs.notes}` : ""}
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
