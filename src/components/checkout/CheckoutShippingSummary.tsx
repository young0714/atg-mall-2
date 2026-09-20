"use client";

import { useState, type ReactNode } from "react";
import { formatMoney } from "@/lib/money";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Currency } from "@prisma/client";

type ShippingOption = {
  serviceLevelId: string;
  serviceLevelName: string;
  carrierName: string;
  estimatedDeliveryDaysMin: number;
  estimatedDeliveryDaysMax: number;
  trackingAvailable: boolean;
  displayCustomerPriceMinor: number;
  displayCurrency: string;
};

type ShipmentGroup = {
  shippingOriginId: string;
  originName: string;
  totalWeightGrams: number;
  itemsLabel: string;
  unavailableReason: string | null;
  options: ShippingOption[];
  defaultServiceLevelId: string | null;
};

export function CheckoutShippingSummary({
  groups,
  subtotalMinor,
  serviceFeeMinor,
  orderCurrency,
  customsDisclaimer,
  canCheckout,
  children,
}: {
  groups: ShipmentGroup[];
  subtotalMinor: number;
  serviceFeeMinor: number;
  orderCurrency: Currency;
  customsDisclaimer: string;
  canCheckout: boolean;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.filter((g) => g.defaultServiceLevelId).map((g) => [g.shippingOriginId, g.defaultServiceLevelId as string])),
  );

  const estimatedShippingMinor = groups.reduce((sum, g) => {
    const chosenId = selected[g.shippingOriginId];
    const option = g.options.find((o) => o.serviceLevelId === chosenId) ?? g.options[0];
    return sum + (option?.displayCustomerPriceMinor ?? 0);
  }, 0);

  return (
    <>
      <section className="space-y-4">
        <h2 className="font-semibold text-navy-900">
          Shipping ({groups.length} shipment{groups.length === 1 ? "" : "s"})
        </h2>
        {groups.map((g, idx) => (
          <div key={g.shippingOriginId} className="card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-navy-800">
                Shipment {idx + 1}: from {g.originName}
              </h3>
              <span className="text-xs text-navy-400">{(g.totalWeightGrams / 1000).toFixed(2)} kg</span>
            </div>
            <p className="mb-3 text-xs text-navy-500">{g.itemsLabel}</p>

            {g.unavailableReason ? (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{g.unavailableReason}</div>
            ) : (
              <div className="space-y-2">
                {g.options.map((o) => (
                  <label
                    key={o.serviceLevelId}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-navy-100 p-3 has-[:checked]:border-atgblue-400 has-[:checked]:bg-atgblue-50"
                  >
                    <span className="flex items-center gap-3 text-sm">
                      <input
                        type="radio"
                        name={`shippingChoice_${g.shippingOriginId}`}
                        value={o.serviceLevelId}
                        checked={selected[g.shippingOriginId] === o.serviceLevelId}
                        onChange={() => setSelected((s) => ({ ...s, [g.shippingOriginId]: o.serviceLevelId }))}
                        required
                      />
                      <span>
                        <span className="font-medium text-navy-800">{o.serviceLevelName}</span>
                        <span className="block text-xs text-navy-400">
                          {o.carrierName} · {o.estimatedDeliveryDaysMin}–{o.estimatedDeliveryDaysMax} days
                          {!o.trackingAvailable && " · no tracking"}
                        </span>
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-navy-800">
                      {formatMoney(o.displayCustomerPriceMinor, o.displayCurrency as Currency)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
        <p className="rounded-lg bg-navy-50 p-3 text-xs text-navy-600">{customsDisclaimer}</p>
      </section>

      {children}

      <section className="card p-5">
        <h2 className="mb-3 font-semibold text-navy-900">Order Summary</h2>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-navy-500">Subtotal</dt><dd>{formatMoney(subtotalMinor, orderCurrency)}</dd></div>
          <div className="flex justify-between"><dt className="text-navy-500">Handling fee (1%)</dt><dd>{formatMoney(serviceFeeMinor, orderCurrency)}</dd></div>
          <div className="flex justify-between"><dt className="text-navy-500">Shipping</dt><dd>{formatMoney(estimatedShippingMinor, orderCurrency)}</dd></div>
          <div className="flex justify-between border-t border-navy-100 pt-1.5 font-semibold text-navy-900">
            <dt>Estimated total</dt><dd>{formatMoney(subtotalMinor + serviceFeeMinor + estimatedShippingMinor, orderCurrency)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-navy-400">
          Final total is recalculated from your actual shipping selection when the order is placed.
        </p>
        <SubmitButton className="btn-primary mt-4 w-full" disabled={!canCheckout} pendingText="Placing order…">
          {canCheckout ? "Place Order" : "Shipping unavailable, see above"}
        </SubmitButton>
      </section>
    </>
  );
}
