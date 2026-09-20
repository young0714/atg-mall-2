import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDestination } from "@/lib/destination";
import { getActiveDestinationCountries } from "@/lib/services/destinationCountryService";
import { toProductCard } from "@/lib/product-view";
import { Hero } from "@/components/home/Hero";
import { WelcomeBack } from "@/components/home/WelcomeBack";
import { ServicesPromo } from "@/components/home/ServicesPromo";
import { ShopTheWorld } from "@/components/home/ShopTheWorld";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Testimonials } from "@/components/home/Testimonials";
import { ProductCard } from "@/components/shop/ProductCard";
import { CategoryCard } from "@/components/shop/CategoryCard";
import { Section, SectionHeading, Container } from "@/components/ui/Section";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [destination, countries, user] = await Promise.all([
    getDestination(),
    getActiveDestinationCountries(),
    getCurrentUser(),
  ]);

  const [featuredProducts, categories, wholesaleProducts, heroImageRows, heroSettings] = await Promise.all([
    db.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    // Secondary sort matters: categories mostly share the default sortOrder
    // (0), and Postgres doesn't guarantee a stable order among ties without
    // one — without it, editing any unrelated field on any category could
    // silently reshuffle which 12 show up here.
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], take: 12 }),
    db.product.findMany({
      where: { isActive: true, isWholesale: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      take: 4,
    }),
    // Admin-managed via /admin/hero-images (see HeroImage) — not tied to
    // any product, since the hero also needs generic service/brand photos.
    // Falls back to the plain gradient hero when nothing's active there.
    db.heroImage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    db.heroSettings.findFirst(),
  ]);
  const heroImages = heroImageRows.map((row) => row.imageUrl);
  const heroSlideDurationMs = (heroSettings?.slideDurationSeconds ?? 5) * 1000;

  const [featuredCards, wholesaleCards] = await Promise.all([
    Promise.all(featuredProducts.map((p) => toProductCard(p, destination))),
    Promise.all(wholesaleProducts.map((p) => toProductCard(p, destination))),
  ]);

  // Logged-in-only content: wallet balance, the most recent shipment worth a
  // nudge, and up to 3 previously-bought (still-active) products for "Buy It
  // Again" — every visitor gets the same Trending/Categories/Wholesale below
  // regardless, this is purely what's ADDED for a signed-in customer.
  let wallet: { balanceMinor: number; currency: (typeof featuredCards)[number]["currency"] } | null = null;
  let recentOrder: { orderNumber: string } | null = null;
  let buyAgainCards: Awaited<ReturnType<typeof toProductCard>>[] = [];

  if (user) {
    const [walletRow, activeOrder, pastItems] = await Promise.all([
      db.wallet.findUnique({ where: { userId: user.id }, select: { balanceMinor: true, currency: true } }),
      db.order.findFirst({
        where: { userId: user.id, status: { in: ["SHIPPED", "IN_TRANSIT", "CUSTOMS", "OUT_FOR_DELIVERY"] } },
        orderBy: { updatedAt: "desc" },
        select: { orderNumber: true },
      }),
      db.orderItem.findMany({
        where: { order: { userId: user.id }, productId: { not: null } },
        include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
        orderBy: { order: { createdAt: "desc" } },
        take: 12, // over-fetched, then deduped by product below
      }),
    ]);

    wallet = walletRow;
    recentOrder = activeOrder;

    const seenProductIds = new Set<string>();
    const dedupedProducts = [];
    for (const item of pastItems) {
      if (!item.product || !item.product.isActive || seenProductIds.has(item.product.id)) continue;
      seenProductIds.add(item.product.id);
      dedupedProducts.push(item.product);
      if (dedupedProducts.length >= 3) break;
    }
    buyAgainCards = await Promise.all(dedupedProducts.map((p) => toProductCard(p, destination)));
  }

  return (
    <PullToRefresh>
      {user ? (
        <WelcomeBack firstName={user.fullName.split(" ")[0]} wallet={wallet} recentOrder={recentOrder} />
      ) : (
        <>
          <Hero destination={destination.isoCode} countries={countries} heroImages={heroImages} heroSlideDurationMs={heroSlideDurationMs} />
          <ServicesPromo />
          <ShopTheWorld />
        </>
      )}

      {buyAgainCards.length > 0 && (
        <Section>
          <Container>
            <SectionHeading eyebrow="Pick up where you left off" title="Buy It Again" />
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {buyAgainCards.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      <Section tone="sand">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <SectionHeading eyebrow="Trending now" title="Trending Products" />
            <Link href="/shop" className="btn-outline shrink-0">View all</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featuredCards.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading eyebrow="Browse" title="Popular Categories" />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <CategoryCard key={c.id} name={c.name} slug={c.slug} imageUrl={c.imageUrl} />
            ))}
          </div>
        </Container>
      </Section>

      {wholesaleCards.length > 0 && (
        <Section tone="sand">
          <Container>
            <div className="flex items-end justify-between gap-4">
              <SectionHeading eyebrow="Buy in bulk" title="Wholesale Deals" description="Lower per-unit cost when you buy by the carton." />
              <Link href="/shop?wholesale=1" className="btn-outline shrink-0">See all wholesale</Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {wholesaleCards.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      <HowItWorks />
      <Testimonials />
    </PullToRefresh>
  );
}
