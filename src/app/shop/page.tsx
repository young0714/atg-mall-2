import { db } from "@/lib/db";
import { getDestination } from "@/lib/destination";
import { toProductCard } from "@/lib/product-view";
import { ProductCard } from "@/components/shop/ProductCard";
import { Container, Section } from "@/components/ui/Section";
import { Input } from "@/components/ui/Form";
import { SortSelect } from "@/components/shop/SortSelect";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = {
  title: "Shop — Buy from China, delivered to Nigeria & Gambia",
  description: "Browse ATG Mall's catalog of products sourced from China, with transparent landed cost estimates for Nigeria and Gambia delivery.",
};

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; wholesale?: string; sort?: string };
}) {
  const destination = getDestination();
  const { q, category, wholesale, sort } = searchParams;

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (category) where.category = { slug: category };
  if (wholesale === "1") where.isWholesale = true;

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { basePriceMinor: "asc" }
      : sort === "price_desc"
        ? { basePriceMinor: "desc" }
        : sort === "rating"
          ? { avgRating: "desc" }
          : { createdAt: "desc" };

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy,
      take: 48,
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const activeCategory = categories.find((c) => c.slug === category);
  const productCards = await Promise.all(products.map((p) => toProductCard(p, destination)));

  return (
    <Section className="!py-10">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-navy-900">
            {activeCategory ? activeCategory.name : "Shop All Products"}
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            {products.length} product{products.length === 1 ? "" : "s"} · Prices shown are estimated landed cost to{" "}
            {destination.label}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-6">
            <form method="GET" className="space-y-3">
              <Input type="search" name="q" placeholder="Search products..." defaultValue={q} />
              {category && <input type="hidden" name="category" value={category} />}
              <button type="submit" className="btn-primary w-full">Search</button>
            </form>

            <div>
              <p className="label mb-2">Categories</p>
              <ul className="space-y-1 text-sm">
                <li>
                  <a
                    href="/shop"
                    className={`block rounded-lg px-3 py-1.5 ${!category ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-sand-100"}`}
                  >
                    All categories
                  </a>
                </li>
                {categories.map((c) => (
                  <li key={c.id}>
                    <a
                      href={`/shop?category=${c.slug}`}
                      className={`block rounded-lg px-3 py-1.5 ${category === c.slug ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-sand-100"}`}
                    >
                      {c.name}
                    </a>
                  </li>
                ))}
              </ul>
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
  );
}
