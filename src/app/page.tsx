import { db } from "@/lib/db";
import { getDestination } from "@/lib/destination";
import { toProductCard } from "@/lib/product-view";
import { Hero } from "@/components/home/Hero";
import { ServicesPromo } from "@/components/home/ServicesPromo";
import { HowItWorks } from "@/components/home/HowItWorks";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { ShippingOptionsSection } from "@/components/home/ShippingOptionsSection";
import { Testimonials } from "@/components/home/Testimonials";
import { FAQSection } from "@/components/home/FAQSection";
import { ProductCard } from "@/components/shop/ProductCard";
import { CategoryCard } from "@/components/shop/CategoryCard";
import { Section, SectionHeading, Container } from "@/components/ui/Section";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const destination = getDestination();

  const [featuredProducts, categories, wholesaleProducts] = await Promise.all([
    db.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      take: 8,
      orderBy: { createdAt: "desc" },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, take: 12 }),
    db.product.findMany({
      where: { isActive: true, isWholesale: true },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      take: 4,
    }),
  ]);

  return (
    <>
      <Hero destination={destination.country} />
      <ServicesPromo />

      <Section tone="sand">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <SectionHeading eyebrow="Trending now" title="Trending Products" />
            <Link href="/shop" className="btn-outline shrink-0">View all</Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={toProductCard(p, destination)} />
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

      {wholesaleProducts.length > 0 && (
        <Section tone="sand">
          <Container>
            <div className="flex items-end justify-between gap-4">
              <SectionHeading eyebrow="Buy in bulk" title="Wholesale Deals" description="Lower per-unit cost when you buy by the carton." />
              <Link href="/shop?wholesale=1" className="btn-outline shrink-0">See all wholesale</Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {wholesaleProducts.map((p) => (
                <ProductCard key={p.id} product={toProductCard(p, destination)} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      <HowItWorks />
      <WhyChooseUs />
      <ShippingOptionsSection />
      <Testimonials />
      <FAQSection />
    </>
  );
}
