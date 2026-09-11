import Link from "next/link";
import { db } from "@/lib/db";
import { Container, Section, SectionHeading } from "@/components/ui/Section";
import { StoreCard } from "@/components/shop/StoreCard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop From China — 1688, Taobao, Alibaba & Suppliers",
  description: "Browse listings from 1688, Taobao and trusted Chinese suppliers, with ATG Mall handling purchase, warehousing and shipping to Nigeria and Gambia.",
};

export const dynamic = "force-dynamic";

export default async function ShopFromChinaPage() {
  const stores = await db.store.findMany({
    where: { country: "CHINA", isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <Section className="!py-12">
      <Container>
        <SectionHeading
          eyebrow="🇨🇳 Shop from China"
          title="1688, Taobao, Alibaba & Verified Suppliers"
          description="Browse sample listings from 1688/Taobao below, or use Shop for Me to send us a product link directly from any Chinese marketplace or supplier."
        />

        <div className="mt-4 rounded-xl2 border border-gold-200 bg-gold-50 p-4 text-sm text-gold-700">
          <strong>Note:</strong> ATG Mall does not yet have a live, authorized API connection to these platforms —
          1688 and Taobao below show realistic mock data to demonstrate the browsing experience. Use{" "}
          <Link href="/shop-for-me" className="underline">Shop for Me</Link> to request any real product you find on
          any of these platforms today.
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
