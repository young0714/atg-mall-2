import Link from "next/link";
import { Section, Container } from "@/components/ui/Section";

const services = [
  {
    title: "Shop Products",
    desc: "Browse ATG's own catalog, marketplace vendors, and products sourced from 1688, Taobao and trusted suppliers — all in one place, already priced with landed cost estimates.",
    href: "/shop",
    cta: "Browse the catalog",
    tone: "bg-atgblue-500",
  },
  {
    title: "Shop For Me",
    desc: "Found a product online? Send us the link and we'll purchase, inspect and ship it to you.",
    href: "/shop-for-me",
    cta: "Submit a request",
    tone: "bg-atggreen-600",
  },
  {
    title: "Source A Product",
    desc: "Tell us what you need — our sourcing team finds verified supplier options and quotes for you to compare.",
    href: "/source-a-product",
    cta: "Start sourcing",
    tone: "bg-navy-800",
  },
];

export function ServicesPromo() {
  return (
    <Section>
      <Container>
        <div className="grid gap-5 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.title} className={`flex flex-col justify-between rounded-xl2 p-7 text-white ${s.tone}`}>
              <div>
                <h3 className="text-xl font-display font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-white/80">{s.desc}</p>
              </div>
              <Link href={s.href} className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25">
                {s.cta} →
              </Link>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
