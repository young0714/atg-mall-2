import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { cjDropshippingService } from "@/lib/services/cjDropshippingService";
import { formatMoney } from "@/lib/money";
import { Input } from "@/components/ui/Form";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Import from CJdropshipping" };
export const dynamic = "force-dynamic";

export default async function AdminCjImportPage({
  searchParams,
}: {
  searchParams: { q?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  if (!cjDropshippingService.isConfigured()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-display font-bold text-navy-900">Import from CJdropshipping</h1>
        <div className="rounded-xl2 border border-gold-200 bg-gold-50 p-4 text-sm text-gold-700">
          CJdropshipping isn&apos;t connected yet — set <code className="rounded bg-white/60 px-1 py-0.5">CJ_API_KEY</code> in
          the environment (from CJ dashboard → My CJ → API → Generate API Key) to enable this page.
        </div>
      </div>
    );
  }

  let results: Awaited<ReturnType<typeof cjDropshippingService.search>> = [];
  let searchError: string | null = null;
  if (searchParams.q) {
    try {
      results = await cjDropshippingService.search(searchParams.q);
    } catch (e) {
      searchError = e instanceof Error ? e.message : "CJdropshipping search failed";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Import from CJdropshipping</h1>
        <p className="text-sm text-navy-500">
          Search CJ&apos;s live catalog and review a product before importing it into the ATG catalog. Nothing is
          imported automatically — you pick the category and confirm each one.
        </p>
      </div>

      {(searchParams.error || searchError) && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error || searchError}</div>
      )}

      <form method="GET" className="card flex gap-3 p-4">
        <Input name="q" defaultValue={searchParams.q} placeholder="Search CJ's catalog, e.g. 'wireless earbuds'" className="flex-1" />
        <button type="submit" className="btn-primary">Search</button>
      </form>

      {searchParams.q && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <div key={p.pid} className="card flex flex-col overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- external CJ CDN, not in next/image's allowlist */}
              <img src={p.imageUrl} alt={p.name} className="aspect-square w-full object-cover" />
              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <h3 className="line-clamp-2 text-sm font-semibold text-navy-900">{p.name}</h3>
                <p className="text-xs text-navy-400">{p.categoryName ?? "Uncategorized"} · SKU {p.sku}</p>
                <p className="text-base font-display font-bold text-navy-900">
                  {formatMoney(p.sellPriceMinorUsd, "USD")} <span className="text-xs font-normal text-navy-400">/ unit (CJ cost)</span>
                </p>
                <Link href={`/admin/cj-import/${p.pid}`} className="btn-primary btn-sm mt-auto">
                  Review &amp; Import
                </Link>
              </div>
            </div>
          ))}
          {results.length === 0 && !searchError && (
            <p className="col-span-full rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
              No CJ products matched &quot;{searchParams.q}&quot;.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
