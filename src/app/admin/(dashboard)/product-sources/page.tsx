import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { SOURCE_PLATFORM_LABELS } from "@/lib/sourcePlatform";
import Link from "next/link";
import type { Metadata } from "next";
import type { SourcePlatform } from "@prisma/client";

export const metadata: Metadata = { title: "Admin — Product Sources" };
export const dynamic = "force-dynamic";

const SOURCE_ORDER: SourcePlatform[] = [
  "ATG",
  "SELLER",
  "MOCK_1688",
  "MOCK_TAOBAO",
  "ALIBABA",
  "USA_STORE",
  "UK_STORE",
  "INTERNATIONAL_STORE",
  "AFFILIATE",
];

export default async function AdminProductSourcesPage() {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const products = await db.product.findMany({
    include: { category: true, seller: true, store: true },
    orderBy: { createdAt: "desc" },
  });

  const isStoreSource = (s: SourcePlatform) =>
    s === "USA_STORE" || s === "UK_STORE" || s === "INTERNATIONAL_STORE";

  const bySource: Record<SourcePlatform, typeof products> = {
    ATG: [],
    SELLER: [],
    MOCK_1688: [],
    MOCK_TAOBAO: [],
    ALIBABA: [],
    USA_STORE: [],
    UK_STORE: [],
    INTERNATIONAL_STORE: [],
    AFFILIATE: [],
  };
  for (const p of products) bySource[p.sourcePlatform].push(p);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Product Sources</h1>
        <p className="text-sm text-navy-500">
          Every product in the catalog, grouped by fulfillment source. Edit a product&apos;s Source from its detail
          page under Products.
        </p>
      </div>

      {SOURCE_ORDER.map((source) => {
        const items = bySource[source];
        if (items.length === 0) return null;
        return (
          <section key={source} className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">
              {SOURCE_PLATFORM_LABELS[source]} <span className="font-normal text-navy-400">({items.length})</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
                  <tr>
                    <th className="p-2">Product</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">{source === "SELLER" ? "Vendor" : source === "AFFILIATE" ? "Partner" : isStoreSource(source) ? "Store" : "Price"}</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {items.map((p) => (
                    <tr key={p.id}>
                      <td className="p-2 font-medium text-navy-800">
                        <Link href={`/admin/products/${p.id}`} className="hover:underline">{p.name}</Link>
                      </td>
                      <td className="p-2 text-navy-500">{p.category.name}</td>
                      <td className="p-2 text-navy-500">
                        {source === "SELLER"
                          ? (p.seller?.storeName ?? "—")
                          : source === "AFFILIATE"
                            ? (p.affiliateProvider ?? "—")
                            : isStoreSource(source)
                              ? (p.store?.name ?? "—")
                              : formatMoney(p.basePriceMinor, p.baseCurrency)}
                      </td>
                      <td className="p-2">
                        <Badge tone={p.isActive ? "green" : "neutral"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {products.length === 0 && (
        <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">No products yet.</div>
      )}
    </div>
  );
}
