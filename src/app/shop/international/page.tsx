import { db } from "@/lib/db";
import { Container, Section, SectionHeading } from "@/components/ui/Section";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "International Stores — Shop from China, USA & UK",
  description:
    "International shopping from Nigeria and Gambia — browse ATG Mall's directory of stores across China, USA and UK, and let ATG handle sourcing, consolidation and shipping.",
  keywords: [
    "International Stores",
    "international shopping from Nigeria",
    "international shopping from Gambia",
    "Shop from China",
    "Shop from USA",
    "Shop from UK",
  ],
};

export const dynamic = "force-dynamic";

const COUNTRIES = [
  {
    code: "CHINA" as const,
    flag: "🇨🇳",
    name: "China",
    href: "/shop-from-china",
    desc: "1688, Taobao, Alibaba and trusted suppliers — bulk and factory-direct pricing.",
    tone: "bg-atgblue-500",
  },
  {
    code: "USA" as const,
    flag: "🇺🇸",
    name: "USA",
    href: "/shop/usa",
    desc: "Amazon, Walmart, Best Buy, Target, eBay and more.",
    tone: "bg-navy-800",
  },
  {
    code: "UK" as const,
    flag: "🇬🇧",
    name: "UK",
    href: "/shop/uk",
    desc: "Amazon UK, Argos, Currys, Tesco, ASOS and more.",
    tone: "bg-atggreen-600",
  },
];

export default async function InternationalStoresPage() {
  const storeCounts = await db.store.groupBy({
    by: ["country"],
    where: { isActive: true },
    _count: { _all: true },
  });
  const countMap = Object.fromEntries(storeCounts.map((c) => [c.country, c._count._all]));

  return (
    <Section className="!py-12">
      <Container>
        <SectionHeading
          eyebrow="Shop the World"
          title="International Stores"
          description="ATG Mall sources from stores across China, the USA and the UK — send us a link from any of them and we'll buy, consolidate and ship it to Nigeria or Gambia."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {COUNTRIES.map((c) => (
            <Link key={c.code} href={c.href} className={`flex flex-col justify-between rounded-xl2 p-7 text-white ${c.tone}`}>
              <div>
                <h3 className="text-xl font-display font-bold">{c.flag} {c.name}</h3>
                <p className="mt-2 text-sm text-white/80">{c.desc}</p>
              </div>
              <span className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25">
                {countMap[c.code] ?? 0} store{(countMap[c.code] ?? 0) === 1 ? "" : "s"} →
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </Section>
  );
}
