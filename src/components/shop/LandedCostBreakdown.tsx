import type { Currency } from "@prisma/client";
import { formatMoney } from "@/lib/money";
import type { LandedCostBreakdown as Breakdown } from "@/lib/services/pricingService";

export function LandedCostBreakdown({
  breakdown,
  quantity = 1,
}: {
  breakdown: Breakdown;
  quantity?: number;
}) {
  const rows: { label: string; amount: number }[] = [
    { label: "Product cost", amount: breakdown.productCostMinor * quantity },
    { label: "Domestic shipping (to ATG warehouse)", amount: breakdown.domesticShippingMinor * quantity },
    ...(breakdown.warehouseHandlingFeeMinor > 0
      ? [{ label: "Warehouse / handling fee", amount: breakdown.warehouseHandlingFeeMinor * quantity }]
      : []),
    { label: "Estimated international shipping", amount: breakdown.intlShippingMinor * quantity },
    { label: "ATG service / sourcing fee", amount: breakdown.serviceFeeMinor * quantity },
  ];
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="rounded-xl2 border border-navy-100 bg-sand-50 p-4">
      <p className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-navy-500">
        Estimated Landed Cost
        <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-semibold text-gold-700">Estimate</span>
      </p>
      <dl className="space-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <dt className="text-navy-500">{row.label}</dt>
            <dd className="font-medium text-navy-800">{formatMoney(row.amount, breakdown.currency as Currency)}</dd>
          </div>
        ))}
      </dl>
      <div className="my-3 border-t border-dashed border-navy-200" />
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-navy-900">Estimated Total</p>
        <p className="text-xl font-display font-bold text-atgblue-600">
          {formatMoney(total, breakdown.currency as Currency)}
        </p>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-navy-400">
        This is an estimate based on admin-configured shipping rates and ATG&apos;s standard service fee. Final
        cost is confirmed once your item is weighed and measured at our China warehouse.
      </p>
    </div>
  );
}
