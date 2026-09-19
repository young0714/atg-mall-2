import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { aliexpressService } from "@/lib/services/aliexpressService";
import { aliexpressAuthIsConfigured, getAliExpressAuthorizationUrl, isAliExpressConnected } from "@/lib/services/aliexpressAuthService";
import { listImportDraftsAction } from "@/app/admin/(dashboard)/product-import/actions";
import { ProductImportWorkspace } from "@/components/admin/ProductImportWorkspace";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Import from AliExpress" };
export const dynamic = "force-dynamic";

export default async function AdminAliExpressImportPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  if (!aliexpressService.isConfigured() || !aliexpressAuthIsConfigured()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-display font-bold text-navy-900">Import from AliExpress</h1>
        <div className="rounded-xl2 border border-gold-200 bg-gold-50 p-4 text-sm text-gold-700">
          AliExpress isn&apos;t connected yet — set <code className="rounded bg-white/60 px-1 py-0.5">ALIEXPRESS_APP_KEY</code>,{" "}
          <code className="rounded bg-white/60 px-1 py-0.5">ALIEXPRESS_APP_SECRET</code> and{" "}
          <code className="rounded bg-white/60 px-1 py-0.5">ALIEXPRESS_CALLBACK_URL</code> in the environment to enable this
          page.
        </div>
      </div>
    );
  }

  const connected = await isAliExpressConnected();

  if (!connected) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-display font-bold text-navy-900">Import from AliExpress</h1>
        {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}
        <div className="card space-y-3 p-6 text-center">
          <p className="text-sm text-navy-500">
            Connect ATG Mall&apos;s AliExpress developer app once to enable product lookups and, later, order placement.
          </p>
          <a href={getAliExpressAuthorizationUrl()} className="btn-primary inline-block">
            Connect AliExpress
          </a>
        </div>
      </div>
    );
  }

  const [categories, initialBatch] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    listImportDraftsAction("ALIEXPRESS"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Import from AliExpress</h1>
        <p className="text-sm text-navy-500">
          Paste a product link or ID copied from aliexpress.com — AliExpress&apos;s API doesn&apos;t offer keyword search
          for this app yet, only exact product lookups. Edit and save each one, then import the whole batch together.
        </p>
      </div>
      <ProductImportWorkspace
        source="ALIEXPRESS"
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initialBatch={initialBatch}
      />
    </div>
  );
}
