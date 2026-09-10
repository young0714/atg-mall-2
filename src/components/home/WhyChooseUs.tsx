import { Section, SectionHeading, Container } from "@/components/ui/Section";

const points = [
  { title: "Transparent landed costs", desc: "See product cost, shipping and fees broken down before you buy — no surprises at delivery.", icon: "🧮" },
  { title: "Built for Nigeria & Gambia", desc: "Local currencies, local delivery zones and destinations you actually ship to.", icon: "🌍" },
  { title: "Sourcing expertise", desc: "Can't find it online? Our sourcing team finds verified suppliers and quotes on your behalf.", icon: "🤝" },
  { title: "Consolidated shipping", desc: "Combine multiple purchases into one shipment to save on international freight.", icon: "📦" },
  { title: "Real order tracking", desc: "Follow your order from warehouse receipt to final delivery with a single ATG tracking number.", icon: "📍" },
  { title: "Backed by Apex Terra Global", desc: "ATG Mall is operated by Apex Terra Global Limited — a Nigeria-based logistics and sourcing company.", icon: "🏢" },
];

export function WhyChooseUs() {
  return (
    <Section>
      <Container>
        <SectionHeading
          eyebrow="Why ATG Mall"
          title="Cross-border shopping, done properly"
          description="ATG Mall was built specifically for buyers in Nigeria and Gambia who want a trustworthy way to shop and import from China."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {points.map((p) => (
            <div key={p.title} className="rounded-xl2 border border-navy-100 p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-atgblue-50 text-lg">
                {p.icon}
              </div>
              <p className="font-semibold text-navy-900">{p.title}</p>
              <p className="mt-1.5 text-sm text-navy-500">{p.desc}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
