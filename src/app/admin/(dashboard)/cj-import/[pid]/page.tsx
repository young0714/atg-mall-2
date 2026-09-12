import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { cjDropshippingService } from "@/lib/services/cjDropshippingService";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { formatMoney } from "@/lib/money";
import { importCjProductAction } from "../actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Review CJ Product" };
export const dynamic = "force-dynamic";

export default async function AdminCjImportDetailPage({
  params,
  searchParams,
}: {
  params: { pid: string };
  searchParams: { error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const [product, categories] = await Promise.all([
    cjDropshippingService.getById(params.pid),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/cj-import" className="text-xs font-medium text-atgblue-600 hover:underline">
        ← Back to search
      </Link>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- external CJ CDN, not in next/image's allowlist */}
          <img src={product.imageUrl} alt={product.name} className="aspect-square w-full rounded-xl2 object-cover" />
          <div className="grid grid-cols-4 gap-2">
            {product.images.slice(0, 8).map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- external CJ CDN
              <img key={url} src={url} alt="" className="aspect-square rounded-lg object-cover" />
            ))}
          </div>
          {product.variants.length > 0 && (
            <div className="card p-4 text-sm">
              <p className="mb-2 font-semibold text-navy-800">CJ Variants ({product.variants.length})</p>
              <ul className="space-y-1 text-navy-500">
                {product.variants.map((v) => (
                  <li key={v.vid}>{v.name} · {formatMoney(v.priceMinorUsd, "USD")}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-navy-400">Imported as-is with a price delta relative to the base price below.</p>
            </div>
          )}
        </div>

        <section className="card p-5">
          <h1 className="mb-1 text-xl font-display font-bold text-navy-900">Review &amp; Import</h1>
          <p className="mb-4 text-sm text-navy-500">CJ SKU {product.sku} · Pid {product.pid}</p>

          {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

          <form action={importCjProductAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="pid" value={product.pid} />
            <div className="sm:col-span-2">
              <Field label="Name" htmlFor="name" required>
                <Input id="name" name="name" defaultValue={product.name} required />
              </Field>
            </div>
            <Field label="Slug" htmlFor="slug" required hint="lowercase-with-hyphens">
              <Input id="slug" name="slug" defaultValue={slugify(product.name)} required />
            </Field>
            <Field label="Category" htmlFor="categoryId" required>
              <Select id="categoryId" name="categoryId" required>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Base price, minor units (CJ cost, USD)" htmlFor="basePriceMinor" required hint="ATG's landed-cost fee/markup is applied automatically on top of this">
              <Input id="basePriceMinor" name="basePriceMinor" type="number" defaultValue={product.sellPriceMinorUsd} required />
            </Field>
            <Field label="Weight (grams)" htmlFor="weightGrams" required>
              <Input id="weightGrams" name="weightGrams" type="number" defaultValue={product.weightGrams ?? 500} required />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description" htmlFor="description" required>
                <Textarea id="description" name="description" defaultValue={product.description ?? ""} required />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="importVariants" value="true" defaultChecked={product.variants.length > 0} /> Import CJ variants
            </label>
            <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Import Product</button>
          </form>
        </section>
      </div>
    </div>
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
