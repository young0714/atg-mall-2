import { db } from "@/lib/db";
import { Container, Section, SectionHeading } from "@/components/ui/Section";
import { StoreCard } from "@/components/shop/StoreCard";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop from USA — Amazon, Walmart, Best Buy & More",
  description:
    "Amazon USA shopping through ATG, Walmart USA shopping through ATG, Best Buy USA shopping through ATG — send us a product link from any American store and we'll source, consolidate and ship it to Nigeria or Gambia.",
  keywords: [
    "Shop from USA",
    "Amazon USA shopping through ATG",
    "Walmart USA shopping through ATG",
    "Best Buy USA shopping through ATG",
    "international shopping from Nigeria",
    "international shopping from Gambia",
  ],
};

export const dynamic = "force-dynamic";

export default async function ShopFromUsaPage() {
  const stores = await db.store.findMany({
    where: { country: "USA", isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <Section className="!py-12">
      <Container>
        <SectionHeading
          eyebrow="🇺🇸 Shop from USA"
          title="Access products from your favorite American stores"
          description="Let ATG handle the sourcing and delivery — send us a link from any of these stores, or any other USA retailer, and we'll take it from there."
        />

        <div className="mt-4 rounded-xl2 border border-gold-200 bg-gold-50 p-4 text-sm text-gold-700">
          <strong>Note:</strong> ATG Mall does not have a live product-search integration with these stores — this is
          a directory of stores we can shop from on your behalf. Use{" "}
          <Link href="/shop-for-me" className="underline">Shop for Me</Link> to send us the link to any specific
          product you want.
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>

        {stores.length === 0 && (
          <div className="mt-10 rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
            No USA stores configured yet.
          </div>
        )}
      </Container>
    </Section>
  );
}
