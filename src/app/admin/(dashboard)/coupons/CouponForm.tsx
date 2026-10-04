"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";

export interface CouponFormValues {
  id?: string;
  code: string;
  percentOff: number;
  windowType: "FIXED_DATES" | "SINCE_SIGNUP";
  startsAt: string; // yyyy-mm-dd
  endsAt: string;
  daysAfterSignup: number;
  maxRedemptions: number; // 0 = no limit
  isActive: boolean;
  showOnSite: boolean;
  siteHeadline: string;
  showCountdown: boolean;
}

const fmt = (d: string) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : "?");

export function CouponForm({
  action,
  initial,
  submitLabel,
}: {
  action: (fd: FormData) => void | Promise<void>;
  initial: CouponFormValues;
  submitLabel: string;
}) {
  const [v, setV] = useState(initial);
  const [margin, setMargin] = useState(50);
  const set = <K extends keyof CouponFormValues>(k: K, val: CouponFormValues[K]) => setV((cur) => ({ ...cur, [k]: val }));
  const editing = !!initial.id;
  const code = (v.code || "CODE").toUpperCase().replace(/\s+/g, "");
  const after = 100 * (1 - (1 - margin / 100) / (1 - v.percentOff / 100));

  const when =
    v.windowType === "FIXED_DATES"
      ? `from ${fmt(v.startsAt)} to ${fmt(v.endsAt)}, the same for everyone`
      : `for ${v.daysAfterSignup || "?"} days after each customer signs up`;

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {!(v.showOnSite && v.windowType === "FIXED_DATES") && v.showCountdown && <input type="hidden" name="showCountdown" value="true" />}
      {!(v.showOnSite && v.windowType === "FIXED_DATES") && v.siteHeadline && <input type="hidden" name="siteHeadline" value={v.siteHeadline} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="code">Code</label>
          <input id="code" name="code" className="input uppercase" value={v.code} onChange={(e) => set("code", e.target.value)} readOnly={editing} required placeholder="LAUNCH20" />
          {editing && <p className="mt-1 text-xs text-navy-400">A code can&apos;t be renamed once created.</p>}
        </div>
        <div>
          <label className="label" htmlFor="percentOff">Percent off</label>
          <div className="flex items-center gap-2">
            <input id="percentOff" name="percentOff" type="number" min={1} max={90} className="input w-24" value={v.percentOff} onChange={(e) => set("percentOff", Number(e.target.value))} required /> %
          </div>
        </div>
      </div>

      <fieldset>
        <legend className="label">Valid</legend>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="windowType" value="FIXED_DATES" checked={v.windowType === "FIXED_DATES"} onChange={() => set("windowType", "FIXED_DATES")} /> Fixed dates for everyone
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="windowType" value="SINCE_SIGNUP" checked={v.windowType === "SINCE_SIGNUP"} onChange={() => set("windowType", "SINCE_SIGNUP")} /> Days after each customer signs up
          </label>
        </div>
        {v.windowType === "FIXED_DATES" ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <input name="startsAt" type="date" className="input w-44" value={v.startsAt} onChange={(e) => set("startsAt", e.target.value)} required aria-label="Start date" />
            to
            <input name="endsAt" type="date" className="input w-44" value={v.endsAt} onChange={(e) => set("endsAt", e.target.value)} required aria-label="End date" />
            <span className="text-xs text-navy-400">Whole days, in UTC (Gambia time). The last day is included.</span>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <input name="daysAfterSignup" type="number" min={1} max={365} className="input w-24" value={v.daysAfterSignup} onChange={(e) => set("daysAfterSignup", Number(e.target.value))} required aria-label="Days after sign-up" />
            days from the customer&apos;s sign-up
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="maxRedemptions">Total order limit</label>
          <div className="flex items-center gap-2">
            <input id="maxRedemptions" name="maxRedemptions" type="number" min={0} className="input w-28" value={v.maxRedemptions} onChange={(e) => set("maxRedemptions", Number(e.target.value))} />
            <span className="text-xs text-navy-400">0 = no limit</span>
          </div>
        </div>
        <div>
          <span className="label">Status</span>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" value="true" checked={v.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active
          </label>
          <p className="mt-1 text-xs text-navy-400">One use per customer is always on.</p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl2 border border-navy-100 p-4">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="showOnSite" value="true" className="mt-1" checked={v.showOnSite && v.windowType === "FIXED_DATES"} disabled={v.windowType !== "FIXED_DATES"} onChange={(e) => set("showOnSite", e.target.checked)} />
          <span>
            <span className="font-medium text-navy-900">Show on the website</span>
            <span className="block text-xs text-navy-500">
              A bar across the top of every page with a Claim offer button, and a one-tap suggestion at checkout. It hides itself when
              the code ends, is switched off, hits its order limit, or the customer has already used it.
              {v.windowType !== "FIXED_DATES" && <span className="text-gold-700"> Only available for fixed-date codes.</span>}
            </span>
          </span>
        </label>
        {v.showOnSite && v.windowType === "FIXED_DATES" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="siteHeadline">Headline in the bar</label>
              <input id="siteHeadline" name="siteHeadline" maxLength={80} className="input" value={v.siteHeadline} onChange={(e) => set("siteHeadline", e.target.value)} placeholder={`${v.percentOff || 20}% OFF everything`} />
              <p className="mt-1 text-xs text-navy-400">Leave empty for "{v.percentOff || 20}% OFF everything".</p>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="showCountdown" value="true" checked={v.showCountdown} onChange={(e) => set("showCountdown", e.target.checked)} /> Show a countdown
            </label>
          </div>
        )}
      </div>

      <div className="rounded-xl2 border border-navy-100 bg-sand-50 p-4 text-sm leading-relaxed">
        <strong>{code}</strong> takes <strong>{v.percentOff || "?"}%</strong> off items (not shipping) {when}. One use per customer
        {v.maxRedemptions > 0 ? <>, first <strong>{v.maxRedemptions}</strong> orders only</> : ", no order limit"}. Products marked &quot;No coupons&quot; are excluded.{" "}
        <span className={v.isActive ? "text-atggreen-700" : "text-red-700"}>{v.isActive ? "Active." : "Switched off."}</span>
      </div>

      <div className="rounded-xl2 border border-dashed border-navy-200 p-4 text-sm">
        <span className="font-medium text-navy-800">Margin check</span>
        <span className="text-navy-500"> — if your margin before the coupon is </span>
        <input type="number" min={0} max={90} className="input mx-1 inline-block w-20" value={margin} onChange={(e) => setMargin(Number(e.target.value))} aria-label="Margin before the coupon" />
        <span className="text-navy-500">%, it becomes </span>
        <strong className={after < 15 ? "text-red-700" : "text-atggreen-700"}>{after.toFixed(1)}%</strong>
        <span className="text-navy-500"> on discounted items (before shipping and fees).</span>
      </div>

      <SubmitButton className="btn-primary">{submitLabel}</SubmitButton>
    </form>
  );
}
