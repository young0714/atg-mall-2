import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { formatMoney } from "@/lib/money";
import { createProductAction, toggleProductActiveAction, deleteProductAction } from "./actions";
import { SOURCE_PLATFORM_LABELS } from "@/lib/sourcePlatform";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Products" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { created?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const [products, categories] = await Promise.all([
    db.product.findMany({ orderBy: { createdAt: "desc" }, include: { category: true, images: { take: 1 } } }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Products</h1>
        <p className="text-sm text-navy-500">{products.length} products in catalog</p>
      </div>

      {searchParams.created && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Product created.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-navy-900">+ Add New Product</summary>
        <form action={createProductAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" required><Input id="name" name="name" required /></Field>
          <Field label="Slug" htmlFor="slug" required hint="lowercase-with-hyphens"><Input id="slug" name="slug" required /></Field>
          <Field label="Category" htmlFor="categoryId" required>
            <Select id="categoryId" name="categoryId" required>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Source" htmlFor="sourcePlatform" required>
            <Select id="sourcePlatform" name="sourcePlatform" defaultValue="ATG" required>
              {Object.entries(SOURCE_PLATFORM_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Image URL" htmlFor="imageUrl"><Input id="imageUrl" name="imageUrl" type="url" /></Field>
          <Field label="Affiliate URL" htmlFor="affiliateUrl" hint="Only used when Source = Affiliate">
            <Input id="affiliateUrl" name="affiliateUrl" type="url" />
          </Field>
          <Field label="Affiliate provider name" htmlFor="affiliateProvider" hint="e.g. Amazon, Jumia — shown on the Buy button">
            <Input id="affiliateProvider" name="affiliateProvider" />
          </Field>
          <Field label="Base price (minor units)" htmlFor="basePriceMinor" required hint="e.g. 3500 = ¥35.00"><Input id="basePriceMinor" name="basePriceMinor" type="number" required /></Field>
          <Field label="Base currency" htmlFor="baseCurrency" required>
            <Select id="baseCurrency" name="baseCurrency" defaultValue="CNY" required>
              <option value="CNY">CNY</option>
              <option value="USD">USD</option>
              <option value="NGN">NGN</option>
              <option value="GMD">GMD</option>
            </Select>
          </Field>
          <Field label="MOQ" htmlFor="moq" required><Input id="moq" name="moq" type="number" defaultValue={1} required /></Field>
          <Field label="Weight (grams)" htmlFor="weightGrams" required><Input id="weightGrams" name="weightGrams" type="number" defaultValue={500} required /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isWholesale" value="true" /> Wholesale item</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" value="true" /> Featured / Trending</label>
          <Field label="Description" htmlFor="description" required>
            <Textarea id="description" name="description" required />
          </Field>
          <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Create Product</button>
        </form>
      </details>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Source</th>
              <th className="p-3">Price</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-medium text-navy-800">
                  <Link href={`/admin/products/${p.id}`} className="hover:underline">{p.name}</Link>
                </td>
                <td className="p-3 text-navy-500">{p.category.name}</td>
                <td className="p-3 text-navy-500">{SOURCE_PLATFORM_LABELS[p.sourcePlatform]}</td>
                <td className="p-3 text-navy-500">{formatMoney(p.basePriceMinor, p.baseCurrency)}</td>
                <td className="p-3">
                  <Badge tone={p.isActive ? "green" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="space-x-2 p-3 text-right">
                  <form action={toggleProductActiveAction} className="inline">
                    <input type="hidden" name="productId" value={p.id} />
                    <button className="text-xs font-medium text-atgblue-600 hover:underline">
                      {p.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                  <form action={deleteProductAction} className="inline">
                    <input type="hidden" name="productId" value={p.id} />
                    <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
