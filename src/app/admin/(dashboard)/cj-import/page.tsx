import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { cjDropshippingService } from "@/lib/services/cjDropshippingService";
import { listImportDraftsAction } from "@/app/admin/(dashboard)/product-import/actions";
import { ProductImportWorkspace } from "@/components/admin/ProductImportWorkspace";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Import from CJdropshipping" };
export const dynamic = "force-dynamic";

export default async function AdminCjImportPage() {
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

  const [categories, initialBatch] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    listImportDraftsAction("CJ"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Import from CJdropshipping</h1>
        <p className="text-sm text-navy-500">
          Search CJ&apos;s live catalog, edit and save each product you want one at a time, then import the whole batch
          together.
        </p>
      </div>
      <ProductImportWorkspace
        source="CJ"
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initialBatch={initialBatch}
      />
    </div>
  );
}
