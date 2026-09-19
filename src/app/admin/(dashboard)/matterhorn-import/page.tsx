import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { matterhornService } from "@/lib/services/matterhornService";
import { listImportDraftsAction } from "@/app/admin/(dashboard)/product-import/actions";
import { ProductImportWorkspace } from "@/components/admin/ProductImportWorkspace";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Import from Matterhorn" };
export const dynamic = "force-dynamic";

export default async function AdminMatterhornImportPage() {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  if (!matterhornService.isConfigured()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-display font-bold text-navy-900">Import from Matterhorn</h1>
        <div className="rounded-xl2 border border-gold-200 bg-gold-50 p-4 text-sm text-gold-700">
          Matterhorn isn&apos;t connected yet — set <code className="rounded bg-white/60 px-1 py-0.5">MATTERHORN_API_KEY</code> in
          the environment (generated from your Matterhorn account panel) to enable this page.
        </div>
      </div>
    );
  }

  const [categories, initialBatch] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" } }),
    listImportDraftsAction("MATTERHORN"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Import from Matterhorn</h1>
        <p className="text-sm text-navy-500">
          Paste a product link or ID copied from matterhorn-wholesale.com — Matterhorn&apos;s API doesn&apos;t offer
          keyword search for this app yet, only exact product lookups. Each color is a separate product — sizes are
          the variants. Edit and save each one, then import the whole batch together.
        </p>
      </div>
      <ProductImportWorkspace
        source="MATTERHORN"
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initialBatch={initialBatch}
      />
    </div>
  );
}
