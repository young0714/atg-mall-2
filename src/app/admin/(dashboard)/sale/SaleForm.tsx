"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { salePriceMinor, defaultSaleHeadline } from "@/lib/salePricing";

export interface SaleFormValues {
  percentOff: number;
  startsAt: string; // yyyy-mm-dd
  endsAt: string;
  headline: string;
  showCountdown: boolean;
  isActive: boolean;
}

const money = (minor: number) => `$${(minor / 100).toFixed(2)}`;
const fmt = (d: string) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : "?");

export function SaleForm({ action, initial }: { action: (fd: FormData) => void | Promise<void>; initial: SaleFormValues }) {
  const [v, setV] = useState(initial);
  const [margin, setMargin] = useState(50);
  const set = <K extends keyof SaleFormValues>(k: K, val: SaleFormValues[K]) => setV((cur) => ({ ...cur, [k]: val }));
  const pct = Math.min(90, Math.max(1, v.percentOff || 1));
  const after = 100 * (1 - (1 - margin / 100) / (1 - pct / 100));
  const examples = [999, 1999, 2999, 5499, 41200];

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="percentOff">Percent off</label>
          <div className="flex items-center gap-2">
            <input id="percentOff" name="percentOff" type="number" min={1} max={90} className="input w-24" value={v.percentOff} onChange={(e) => set("percentOff", Number(e.target.value))} required /> %
          </div>
        </div>
        <div>
          <span className="label">Status</span>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" value="true" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Switched on
          </label>
          <p className="mt-1 text-xs text-navy-400">Turn off to end the sale at once.</p>
        </div>
      </div>

      <div>
        <span className="label">Runs</span>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input name="startsAt" type="date" className="input w-44" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} required aria-label="Start date" />
          to
          <input name="endsAt" type="date" className="input w-44" value={v.endsAt} onChange={(e) => set("endsAt", e.target.value)} required aria-label="End date" />
          <span className="text-xs text-navy-400">Whole days, in UTC (Gambia time). The last day is included.</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="headline">Headline in the top bar</label>
          <input id="headline" name="headline" maxLength={80} className="input" value={v.headline} onChange={(e) => set("headline", e.target.value)} placeholder={defaultSaleHeadline(pct)} />
          <p className="mt-1 text-xs text-navy-400">Leave empty for "{defaultSaleHeadline(pct)}".</p>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="showCountdown" value="true" checked={v.showCountdown} onChange={(e) => set("showCountdown", e.target.checked)} /> Show a countdown
        </label>
      </div>

      <div className="rounded-xl2 border border-navy-100 bg-sand-50 p-4 text-sm leading-relaxed">
        <p>
          <strong>{pct}% off</strong> everything that isn&apos;t excluded, from <strong>{fmt(v.startsAt)}</strong> to <strong>{fmt(v.endsAt)}</strong>. Customers see the normal price crossed out
          beside the sale price, with a &quot;% OFF&quot; tag. Coupons don&apos;t apply on top of sale prices.{" "}
          <span className={v.isActive ? "text-atggreen-700" : "text-red-700"}>{v.isActive ? "Switched on." : "Switched off."}</span>
        </p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-navy-400">What prices become (rounded to a .99 price)</p>
        <ul className="mt-1 grid gap-x-6 sm:grid-cols-2">
          {examples.map((p) => {
            const s = salePriceMinor(p, pct);
            return (
              <li key={p} className="tabular-nums">
                <s className="text-navy-400">{money(p)}</s> → <strong>{money(s)}</strong>{" "}
                <span className="text-xs text-navy-500">({Math.round(((p - s) / p) * 100)}% off)</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl2 border border-dashed border-navy-200 p-4 text-sm">
        <span className="font-medium text-navy-800">Margin check</span>
        <span className="text-navy-500"> — if a product&apos;s margin is </span>
        <input type="number" min={0} max={90} className="input mx-1 inline-block w-20" value={margin} onChange={(e) => setMargin(Number(e.target.value))} aria-label="Margin before the sale" />
        <span className="text-navy-500">%, it becomes </span>
        <strong className={after < 15 ? "text-red-700" : "text-atggreen-700"}>{after.toFixed(1)}%</strong>
        <span className="text-navy-500"> during the sale (before shipping and fees). Tick &quot;No coupons or sale discounts&quot; on any product that would fall below about 15%.</span>
      </div>

      <SubmitButton className="btn-primary">Save sale</SubmitButton>
    </form>
  );
}
