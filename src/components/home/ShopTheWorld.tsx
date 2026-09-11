import Link from "next/link";
import { Section, Container, SectionHeading } from "@/components/ui/Section";

const countries = [
  {
    flag: "🇨🇳",
    name: "China",
    stores: "1688 • Taobao • Alibaba",
    href: "/shop-from-china",
    tone: "bg-atgblue-500",
  },
  {
    flag: "🇺🇸",
    name: "USA",
    stores: "Amazon • Walmart • Best Buy • Target",
    href: "/shop/usa",
    tone: "bg-navy-800",
  },
  {
    flag: "🇬🇧",
    name: "UK",
    stores: "Amazon UK • Argos • Currys • ASOS",
    href: "/shop/uk",
    tone: "bg-atggreen-600",
  },
];

export function ShopTheWorld() {
  return (
    <Section>
      <Container>
        <SectionHeading
          eyebrow="Shop the World"
          title="Shop the World with ATG"
          description="ATG isn't limited to products already listed here — send us a link from any store in China, the USA or the UK, and we'll source, consolidate and ship it to you."
        />
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {countries.map((c) => (
            <Link key={c.name} href={c.href} className={`flex flex-col justify-between rounded-xl2 p-7 text-white ${c.tone}`}>
              <div>
                <h3 className="text-xl font-display font-bold">{c.flag} {c.name}</h3>
                <p className="mt-2 text-sm text-white/80">{c.stores}</p>
              </div>
              <span className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25">
                Shop from {c.name} →
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href="/shop/international" className="btn-outline">
            Explore International Stores
          </Link>
        </div>
      </Container>
    </Section>
  );
}
