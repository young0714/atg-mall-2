import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { describeCoupon } from "@/lib/couponRules";
import { formatMoney } from "@/lib/money";
import { CouponForm } from "./CouponForm";
import { createCouponAction, toggleCouponAction } from "./actions";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Coupons" };
export const dynamic = "force-dynamic";

const todayIso = () => new Date().toISOString().slice(0, 10);
const plusDaysIso = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export default async function AdminCouponsPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const [coupons, usage] = await Promise.all([
    db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    db.couponRedemption.groupBy({ by: ["couponId", "currency"], _count: { _all: true }, _sum: { discountMinor: true } }),
  ]);
  const usedBy = new Map<string, { count: number; byCurrency: { currency: string; minor: number }[] }>();
  for (const u of usage) {
    const cur = usedBy.get(u.couponId) ?? { count: 0, byCurrency: [] };
    cur.count += u._count._all;
    cur.byCurrency.push({ currency: u.currency, minor: u._sum.discountMinor ?? 0 });
    usedBy.set(u.couponId, cur);
  }
  const now = new Date();

  function statusOf(c: (typeof coupons)[number]): { label: string; tone: "green" | "gold" | "neutral" | "red" } {
    if (!c.isActive) return { label: "Switched off", tone: "neutral" };
    if (c.windowType === "FIXED_DATES") {
      if (c.startsAt && now < c.startsAt) return { label: "Scheduled", tone: "gold" };
      if (c.endsAt && now > c.endsAt) return { label: "Ended", tone: "neutral" };
    }
    const used = usedBy.get(c.id)?.count ?? 0;
    if (c.maxRedemptions !== null && used >= c.maxRedemptions) return { label: "Limit reached", tone: "red" };
    return { label: "Live", tone: "green" };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Coupons</h1>
        <p className="text-sm text-navy-500">
          A code customers type at checkout for a percentage off items (never shipping). One use per customer. To keep a
          product out of every coupon, tick &quot;No coupons&quot; on its product page.
        </p>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <details className="card p-5" open={coupons.length === 0}>
        <summary className="cursor-pointer font-semibold text-navy-900">+ Create a code</summary>
        <div className="mt-4">
          <CouponForm
            action={createCouponAction}
            submitLabel="Create code"
            initial={{ code: "", percentOff: 20, windowType: "FIXED_DATES", startsAt: todayIso(), endsAt: plusDaysIso(14), daysAfterSignup: 14, maxRedemptions: 500, isActive: true, showOnSite: false, siteHeadline: "", showCountdown: true }}
          />
        </div>
      </details>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Offer</th>
              <th className="p-3">Used</th>
              <th className="p-3">Discount given</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const u = usedBy.get(c.id);
              const st = statusOf(c);
              return (
                <tr key={c.id} className="border-b border-navy-50 align-top last:border-0">
                  <td className="p-3 font-mono font-semibold text-navy-900">{c.code}</td>
                  <td className="max-w-sm p-3 text-navy-600">
                    {describeCoupon(c)}
                    {c.showOnSite && <div className="mt-1"><Badge tone="blue">Shown on the website</Badge></div>}
                  </td>
                  <td className="whitespace-nowrap p-3 tabular-nums">{u?.count ?? 0}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</td>
                  <td className="whitespace-nowrap p-3 tabular-nums">
                    {u && u.byCurrency.length > 0 ? u.byCurrency.map((b) => <div key={b.currency}>{formatMoney(b.minor, b.currency as never)}</div>) : "—"}
                  </td>
                  <td className="p-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                  <td className="whitespace-nowrap p-3 text-xs">
                    <Link href={`/admin/coupons/${c.id}`} className="text-atgblue-700 underline">Edit</Link>
                    <form action={toggleCouponAction} className="ml-3 inline">
                      <input type="hidden" name="id" value={c.id} />
                      <SubmitButton className="btn-outline btn-sm">{c.isActive ? "Switch off" : "Switch on"}</SubmitButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {coupons.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-navy-400">No codes yet. Create your first one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
