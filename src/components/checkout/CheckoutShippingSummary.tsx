"use client";

import { useState, type ReactNode } from "react";
import { formatMoney } from "@/lib/money";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { previewCouponAction } from "@/app/checkout/actions";
import { OFFER_COOKIE } from "@/lib/offerCookie";
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
  initialCoupon = null,
  suggestedOffer = null,
  customsDisclaimer,
  canCheckout,
  children,
}: {
  groups: ShipmentGroup[];
  subtotalMinor: number;
  serviceFeeMinor: number;
  orderCurrency: Currency;
  initialCoupon?: { code: string; percentOff: number; discountMinor: number; eligibleMinor: number } | null;
  suggestedOffer?: { code: string; percentOff: number } | null;
  customsDisclaimer: string;
  canCheckout: boolean;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.filter((g) => g.defaultServiceLevelId).map((g) => [g.shippingOriginId, g.defaultServiceLevelId as string])),
  );

  // Coupon: the server decides everything (rules, eligible items, amount); this only shows it.
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; percentOff: number; discountMinor: number; eligibleMinor: number } | null>(initialCoupon);
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(
    initialCoupon ? { ok: true, text: `${initialCoupon.code} applied: ${initialCoupon.percentOff}% off eligible items.` } : null,
  );
  const [couponBusy, setCouponBusy] = useState(false);

  async function applyCoupon(code: string = couponInput) {
    if (!code.trim()) {
      setCouponMsg({ ok: false, text: "Enter a code first." });
      return;
    }
    setCouponBusy(true);
    try {
      const r = await previewCouponAction(code);
      if (r.ok) {
        setCoupon(r);
        setCouponMsg({ ok: true, text: `Code applied: ${r.percentOff}% off eligible items.` });
      } else {
        setCoupon(null);
        setCouponMsg({ ok: false, text: r.error });
      }
    } catch {
      setCoupon(null);
      setCouponMsg({ ok: false, text: "Couldn't check that code. Try again." });
    }
    setCouponBusy(false);
  }
  function removeCoupon() {
    // Also forget a claimed offer, or it would be applied again on the next visit to checkout.
    try {
      document.cookie = `${OFFER_COOKIE}=; path=/; max-age=0`;
    } catch {
      // Cookies blocked: nothing to forget.
    }
    setCoupon(null);
    setCouponMsg(null);
    setCouponInput("");
  }
  const discountMinor = coupon?.discountMinor ?? 0;
  // The handling fee follows what the customer pays for items, after the discount.
  const shownFeeMinor = coupon ? Math.round((subtotalMinor - discountMinor) * 0.01) : serviceFeeMinor;

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
          {coupon && (
            <div className="flex justify-between text-atggreen-700">
              <dt>
                Discount ({coupon.code}, {coupon.percentOff}% on {formatMoney(coupon.eligibleMinor, orderCurrency)} of items)
                <button type="button" onClick={removeCoupon} className="ml-2 text-xs underline">Remove</button>
              </dt>
              <dd>-{formatMoney(discountMinor, orderCurrency)}</dd>
            </div>
          )}
          <div className="flex justify-between"><dt className="text-navy-500">Handling fee (1%)</dt><dd>{formatMoney(shownFeeMinor, orderCurrency)}</dd></div>
          <div className="flex justify-between"><dt className="text-navy-500">Shipping</dt><dd>{formatMoney(estimatedShippingMinor, orderCurrency)}</dd></div>
          <div className="flex justify-between border-t border-navy-100 pt-1.5 font-semibold text-navy-900">
            <dt>Estimated total</dt><dd>{formatMoney(subtotalMinor - discountMinor + shownFeeMinor + estimatedShippingMinor, orderCurrency)}</dd>
          </div>
        </dl>

        {!coupon && suggestedOffer && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
            <span>An offer is available: <strong>{suggestedOffer.code}</strong>, {suggestedOffer.percentOff}% off.</span>
            <button type="button" onClick={() => void applyCoupon(suggestedOffer.code)} disabled={couponBusy} className="btn-outline btn-sm disabled:opacity-60">
              Apply {suggestedOffer.code}
            </button>
          </div>
        )}
        {!coupon && (
          <div className="mt-4">
            <label className="label" htmlFor="couponInput">Have a code?</label>
            <div className="flex gap-2">
              <input
                id="couponInput"
                className="input flex-1 uppercase"
                value={couponInput}
                onChange={(e) => { setCouponInput(e.target.value); setCouponMsg(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void applyCoupon(couponInput); } }}
                placeholder="LAUNCH20"
                autoComplete="off"
              />
              <button type="button" onClick={() => void applyCoupon(couponInput)} disabled={couponBusy} className="btn-outline shrink-0 disabled:opacity-60">
                {couponBusy ? "Checking…" : "Apply"}
              </button>
            </div>
          </div>
        )}
        {couponMsg && (
          <p className={`mt-2 text-xs font-medium ${couponMsg.ok ? "text-atggreen-700" : "text-red-700"}`} role={couponMsg.ok ? "status" : "alert"}>
            {couponMsg.text}
          </p>
        )}
        <input type="hidden" name="couponCode" value={coupon?.code ?? ""} />
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
