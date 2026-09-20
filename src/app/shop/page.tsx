import { db } from "@/lib/db";
import { getDestination } from "@/lib/destination";
import { toProductCard } from "@/lib/product-view";
import { ProductCard } from "@/components/shop/ProductCard";
import { Container, Section } from "@/components/ui/Section";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { Input } from "@/components/ui/Form";
import { SortSelect } from "@/components/shop/SortSelect";
import { buildCategoryTree, collectDescendantIds, getActivePath, type CategoryTreeNode } from "@/lib/categoryTree";
import { MobileCategoryDrawer } from "@/components/shop/MobileCategoryDrawer";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = {
  title: "Shop: Buy from China, delivered worldwide",
  description: "Browse ATG Mall's catalog of products sourced from China, with worldwide delivery.",
  openGraph: {
    title: "Shop: Buy from China, delivered worldwide",
    description: "Browse ATG Mall's catalog of products sourced from China, with worldwide delivery.",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop: Buy from China, delivered worldwide",
    description: "Browse ATG Mall's catalog of products sourced from China, with worldwide delivery.",
    images: ["/logo.png"],
  },
};

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; wholesale?: string; sort?: string };
}) {
  const destination = await getDestination();
  const { q, category, wholesale, sort } = searchParams;

  const categories = await db.category.findMany({ orderBy: { name: "asc" } });
  const categoryTree = buildCategoryTree(categories);
  const activeCategory = categories.find((c) => c.slug === category);
  const activeCategoryPath = activeCategory ? getActivePath(categories, activeCategory.id) : null;

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  // Selecting a category shows its own products AND every descendant
  // category's products (e.g. picking "Shoes" also shows "Sneakers",
  // "Boots", etc.) — not just an exact match.
  if (activeCategory) where.categoryId = { in: collectDescendantIds(categories, activeCategory.id) };
  if (wholesale === "1") where.isWholesale = true;

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { basePriceMinor: "asc" }
      : sort === "price_desc"
        ? { basePriceMinor: "desc" }
        : sort === "rating"
          ? { avgRating: "desc" }
          : { createdAt: "desc" };

  const products = await db.product.findMany({
    where,
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    orderBy,
    take: 48,
  });

  const productCards = await Promise.all(products.map((p) => toProductCard(p, destination)));

  const categoryNav = (
    <ul className="space-y-1 text-sm">
      <li>
        <a
          href="/shop"
          className={`block rounded-lg px-3 py-1.5 ${!category ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-sand-100"}`}
        >
          All categories
        </a>
      </li>
      {categoryTree.map((node) => (
        <CategoryNavItem key={node.id} node={node} depth={0} activeSlug={category} activePath={activeCategoryPath} />
      ))}
    </ul>
  );

  return (
    <PullToRefresh>
    <Section className="!py-10">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-navy-900">
            {activeCategory ? activeCategory.name : "Shop All Products"}
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            {products.length} product{products.length === 1 ? "" : "s"} · Prices shown in{" "}
            {destination.currency}. Shipping and fees are calculated at checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-6">
            <form method="GET" className="space-y-3">
              <Input type="search" name="q" placeholder="Search products..." defaultValue={q} />
              {category && <input type="hidden" name="category" value={category} />}
              <SubmitButton className="btn-primary w-full">Search</SubmitButton>
            </form>

            <div>
              <p className="label mb-2 hidden lg:block">Categories</p>
              {/* Rendered once, shown two different ways: inline in the
                  desktop sidebar, and inside a bottom-sheet drawer on
                  mobile (a fully vertical tree pushed the whole product
                  grid below the fold on phones once categories gained
                  real nesting). */}
              <div className="hidden lg:block">{categoryNav}</div>
              <MobileCategoryDrawer activeLabel={activeCategory?.name ?? "All categories"}>{categoryNav}</MobileCategoryDrawer>
            </div>

            <div>
              <a
                href={category ? `/shop?category=${category}&wholesale=1` : "/shop?wholesale=1"}
                className={`block rounded-lg border px-3 py-2 text-sm font-medium ${wholesale === "1" ? "border-atgblue-400 bg-atgblue-50 text-atgblue-700" : "border-navy-100 text-navy-600 hover:bg-sand-100"}`}
              >
                Wholesale only
              </a>
            </div>
          </aside>

          <div>
            <div className="mb-4 flex justify-end">
              <form method="GET" className="flex items-center gap-2 text-sm">
                {q && <input type="hidden" name="q" value={q} />}
                {category && <input type="hidden" name="category" value={category} />}
                {wholesale && <input type="hidden" name="wholesale" value={wholesale} />}
                <label className="text-navy-500">Sort by</label>
                <SortSelect defaultValue={sort ?? "newest"} />
              </form>
            </div>

            {products.length === 0 ? (
              <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
                No products match your search yet. Try Shop for Me or Source a Product instead.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {productCards.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </Section>
    </PullToRefresh>
  );
}

function CategoryNavItem({
  node,
  depth,
  activeSlug,
  activePath,
}: {
  node: CategoryTreeNode;
  depth: number;
  activeSlug: string | undefined;
  activePath: Set<string> | null;
}) {
  const isActive = node.slug === activeSlug;
  const isOnActivePath = activePath?.has(node.id) ?? false;

  return (
    <li>
      <a
        href={`/shop?category=${node.slug}`}
        style={{ paddingLeft: `${0.75 + depth * 0.9}rem` }}
        className={`block rounded-lg py-1.5 pr-3 ${isActive ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-sand-100"}`}
      >
        {node.name}
      </a>
      {node.children.length > 0 && isOnActivePath && (
        <ul className="space-y-1">
          {node.children.map((child) => (
            <CategoryNavItem key={child.id} node={child} depth={depth + 1} activeSlug={activeSlug} activePath={activePath} />
          ))}
        </ul>
      )}
    </li>
  );
}
