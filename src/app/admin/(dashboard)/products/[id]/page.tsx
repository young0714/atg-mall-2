import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { notFound } from "next/navigation";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { formatMoney } from "@/lib/money";
import { SOURCE_PLATFORM_LABELS } from "@/lib/sourcePlatform";
import Link from "next/link";
import type { Metadata } from "next";
import {
  updateProductAction,
  addProductImageAction,
  deleteProductImageAction,
  addProductVariantAction,
  deleteProductVariantAction,
} from "./actions";

export const metadata: Metadata = { title: "Admin — Edit Product" };
export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { updated?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { name: "asc" } },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/admin/products" className="text-xs font-medium text-atgblue-600 hover:underline">
            ← Back to products
          </Link>
          <h1 className="mt-1 text-2xl font-display font-bold text-navy-900">{product.name}</h1>
          <p className="text-sm text-navy-500">{formatMoney(product.basePriceMinor, product.baseCurrency)} · {product.category.name}</p>
        </div>
      </div>

      {searchParams.updated && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Details</h2>
        <form action={updateProductAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="productId" value={product.id} />
          <Field label="Name" htmlFor="name" required><Input id="name" name="name" defaultValue={product.name} required /></Field>
          <Field label="Slug" htmlFor="slug" required hint="lowercase-with-hyphens">
            <Input id="slug" name="slug" defaultValue={product.slug} required />
          </Field>
          <Field label="Category" htmlFor="categoryId" required>
            <Select id="categoryId" name="categoryId" defaultValue={product.categoryId} required>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Source" htmlFor="sourcePlatform" required>
            <Select id="sourcePlatform" name="sourcePlatform" defaultValue={product.sourcePlatform} required>
              {Object.entries(SOURCE_PLATFORM_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Affiliate URL" htmlFor="affiliateUrl" hint="Only used when Source = Affiliate">
            <Input id="affiliateUrl" name="affiliateUrl" type="url" defaultValue={product.affiliateUrl ?? ""} />
          </Field>
          <Field label="Affiliate provider name" htmlFor="affiliateProvider" hint="e.g. Amazon, Jumia — shown on the Buy button">
            <Input id="affiliateProvider" name="affiliateProvider" defaultValue={product.affiliateProvider ?? ""} />
          </Field>
          <Field label="Base price (minor units)" htmlFor="basePriceMinor" required hint="e.g. 3500 = ¥35.00">
            <Input id="basePriceMinor" name="basePriceMinor" type="number" defaultValue={product.basePriceMinor} required />
          </Field>
          <Field label="Base currency" htmlFor="baseCurrency" required>
            <Select id="baseCurrency" name="baseCurrency" defaultValue={product.baseCurrency} required>
              <option value="CNY">CNY</option>
              <option value="USD">USD</option>
              <option value="NGN">NGN</option>
              <option value="GMD">GMD</option>
            </Select>
          </Field>
          <Field label="MOQ" htmlFor="moq" required><Input id="moq" name="moq" type="number" defaultValue={product.moq} required /></Field>
          <Field label="Weight (grams)" htmlFor="weightGrams" required>
            <Input id="weightGrams" name="weightGrams" type="number" defaultValue={product.weightGrams} required />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isWholesale" value="true" defaultChecked={product.isWholesale} /> Wholesale item
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFeatured" value="true" defaultChecked={product.isFeatured} /> Featured / Trending
          </label>
          <Field label="Description" htmlFor="description" required>
            <Textarea id="description" name="description" defaultValue={product.description} required />
          </Field>
          <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Save changes</button>
        </form>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Images ({product.images.length})</h2>
        {product.images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {product.images.map((img) => (
              <div key={img.id} className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.altText ?? ""} className="aspect-square w-full rounded-lg border border-navy-100 object-cover" />
                <p className="truncate text-xs text-navy-400">Order {img.sortOrder}</p>
                <form action={deleteProductImageAction}>
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="imageId" value={img.id} />
                  <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                </form>
              </div>
            ))}
          </div>
        )}
        <details>
          <summary className="cursor-pointer text-sm font-medium text-atgblue-600">+ Add image</summary>
          <form action={addProductImageAction} className="mt-3 grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="productId" value={product.id} />
            <Field label="Image URL" htmlFor="url" required><Input id="url" name="url" type="url" required /></Field>
            <Field label="Alt text" htmlFor="altText"><Input id="altText" name="altText" /></Field>
            <Field label="Sort order" htmlFor="sortOrder" hint="Lower shows first">
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={product.images.length} />
            </Field>
            <button type="submit" className="btn-primary sm:col-span-3 sm:w-fit">Add image</button>
          </form>
        </details>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-navy-900">Variants ({product.variants.length})</h2>
        {product.variants.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">SKU</th>
                  <th className="p-2">Price delta</th>
                  <th className="p-2">Stock</th>
                  <th className="p-2">Attributes</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {product.variants.map((v) => (
                  <tr key={v.id}>
                    <td className="p-2 font-medium text-navy-800">{v.name}</td>
                    <td className="p-2 text-navy-500">{v.sku ?? "—"}</td>
                    <td className="p-2 text-navy-500">
                      {v.priceDeltaMinor >= 0 ? "+" : ""}
                      {formatMoney(v.priceDeltaMinor, product.baseCurrency)}
                    </td>
                    <td className="p-2 text-navy-500">{v.stock}</td>
                    <td className="p-2 text-navy-400">{JSON.stringify(v.attributes)}</td>
                    <td className="p-2 text-right">
                      <form action={deleteProductVariantAction}>
                        <input type="hidden" name="productId" value={product.id} />
                        <input type="hidden" name="variantId" value={v.id} />
                        <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <details>
          <summary className="cursor-pointer text-sm font-medium text-atgblue-600">+ Add variant</summary>
          <form action={addProductVariantAction} className="mt-3 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="productId" value={product.id} />
            <Field label="Name" htmlFor="v-name" required hint='e.g. "Black / XL"'>
              <Input id="v-name" name="name" required />
            </Field>
            <Field label="SKU" htmlFor="v-sku"><Input id="v-sku" name="sku" /></Field>
            <Field label="Price delta (minor units)" htmlFor="v-priceDeltaMinor" hint="Added to base price; can be negative">
              <Input id="v-priceDeltaMinor" name="priceDeltaMinor" type="number" defaultValue={0} />
            </Field>
            <Field label="Stock" htmlFor="v-stock"><Input id="v-stock" name="stock" type="number" defaultValue={999} /></Field>
            <Field label="Attributes (JSON)" htmlFor="v-attributes" hint='e.g. {"color":"Black","size":"XL"}'>
              <Input id="v-attributes" name="attributes" placeholder='{"color":"Black","size":"XL"}' />
            </Field>
            <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Add variant</button>
          </form>
        </details>
      </section>
    </div>
  );
}
