import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/ui/Section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop From China — 1688, Taobao & Suppliers",
  description: "Browse listings from 1688, Taobao and trusted Chinese suppliers, with ATG Mall handling purchase, warehousing and shipping to Nigeria and Gambia.",
};

export default function ShopFromChinaPage() {
  return (
    <Section className="!py-12">
      <Container>
        <SectionHeading
          eyebrow="Shop from China"
          title="1688, Taobao & Verified Suppliers"
          description="Browse sample listings below, or use Shop for Me to send us a product link directly from any Chinese marketplace."
        />

        <div className="mt-4 rounded-xl2 border border-gold-200 bg-gold-50 p-4 text-sm text-gold-700">
          <strong>Note:</strong> ATG Mall does not yet have a live, authorized API connection to 1688 or Taobao — the
          listings below are realistic mock data used to demonstrate the browsing and pricing experience. Use{" "}
          <Link href="/shop-for-me" className="underline">Shop for Me</Link> to request any real product you find on
          those platforms today.
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <Link href="/shop-from-china/1688" className="card p-8">
            <p className="text-2xl font-display font-bold text-navy-900">1688</p>
            <p className="mt-2 text-sm text-navy-500">
              China's largest wholesale marketplace — bulk and factory-direct pricing, higher MOQs.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-atgblue-600">Browse 1688 listings →</span>
          </Link>
          <Link href="/shop-from-china/taobao" className="card p-8">
            <p className="text-2xl font-display font-bold text-navy-900">Taobao</p>
            <p className="mt-2 text-sm text-navy-500">
              China's largest consumer marketplace — single-unit retail pricing, huge variety.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold text-atgblue-600">Browse Taobao listings →</span>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
