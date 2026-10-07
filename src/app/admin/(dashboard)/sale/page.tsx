import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { SaleForm } from "./SaleForm";
import { saveSaleAction } from "./actions";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Sale" };
export const dynamic = "force-dynamic";

const todayIso = () => new Date().toISOString().slice(0, 10);
const plusDaysIso = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function AdminSalePage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const [sale, liveProducts, excluded, couponBars] = await Promise.all([
    db.siteSale.findFirst({ orderBy: { updatedAt: "desc" } }),
    db.product.count({ where: { isActive: true } }),
    db.product.count({ where: { isActive: true, noCoupons: true } }),
    db.coupon.count({ where: { isActive: true, showOnSite: true } }),
  ]);

  const now = new Date();
  const status = !sale
    ? { label: "No sale set up", tone: "neutral" as const }
    : !sale.isActive
      ? { label: "Switched off", tone: "neutral" as const }
      : now < sale.startsAt
        ? { label: "Scheduled", tone: "gold" as const }
        : now > sale.endsAt
          ? { label: "Ended", tone: "neutral" as const }
          : { label: "Live now", tone: "green" as const };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-display font-bold text-navy-900">Sale</h1>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="text-sm text-navy-500">
          A site-wide sale on every eligible product. Customers see the normal price crossed out beside the sale price, are charged the
          sale price, and the top bar shows a countdown. Prices go back to normal on their own when it ends.
        </p>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Saved. Prices across the shop update straight away.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-navy-400">Live products</p>
          <p className="text-2xl font-display font-bold text-navy-900">{liveProducts}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-navy-400">Excluded from the sale</p>
          <p className="text-2xl font-display font-bold text-navy-900">{excluded}</p>
          <p className="text-xs text-navy-400">Ticked &quot;No coupons or sale discounts&quot;</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase tracking-wide text-navy-400">Before you switch on</p>
          <p className="mt-1 text-sm text-navy-600">
            Run the <Link href="/admin/aliexpress-variant-check" className="text-atgblue-700 underline">Price check</Link> at 41% and exclude every product it flags.
          </p>
        </div>
      </div>

      {couponBars > 0 && (
        <div className="rounded-lg bg-gold-50 p-3 text-sm text-gold-700">
          A coupon is also set to show on the website. While a sale is live the sale bar takes the top bar, and coupons don&apos;t apply to sale
          prices. Switch the coupon off in <Link href="/admin/coupons" className="underline">Coupons</Link> if you don&apos;t need it.
        </div>
      )}

      <div className="card p-5">
        <SaleForm
          action={saveSaleAction}
          initial={{
            percentOff: sale?.percentOff ?? 30,
            startsAt: sale ? iso(sale.startsAt) : todayIso(),
            endsAt: sale ? iso(sale.endsAt) : plusDaysIso(13),
            headline: sale?.headline ?? "",
            showCountdown: sale?.showCountdown ?? true,
            isActive: sale?.isActive ?? true,
          }}
        />
      </div>
    </div>
  );
}
