import { db } from "@/lib/db";
import { Container, Section, SectionHeading } from "@/components/ui/Section";
import { StoreCard } from "@/components/shop/StoreCard";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop from UK — Amazon UK, Argos, Currys & More",
  description:
    "UK shopping through ATG — Amazon UK, Argos, Currys, Tesco, ASOS and more. Send us a product link from any UK store and we'll source, consolidate and ship it to Nigeria or Gambia.",
  keywords: [
    "Shop from UK",
    "UK shopping through ATG",
    "international shopping from Nigeria",
    "international shopping from Gambia",
  ],
};

export const dynamic = "force-dynamic";

export default async function ShopFromUkPage() {
  const stores = await db.store.findMany({
    where: { country: "UK", isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <Section className="!py-12">
      <Container>
        <SectionHeading
          eyebrow="🇬🇧 Shop from UK"
          title="Shop from leading UK stores"
          description="Have ATG source and deliver your purchases internationally — send us a link from any of these stores, or any other UK retailer."
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
            No UK stores configured yet.
          </div>
        )}
      </Container>
    </Section>
  );
}
