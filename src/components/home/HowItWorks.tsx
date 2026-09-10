import { Section, SectionHeading, Container } from "@/components/ui/Section";

const steps = [
  { title: "Shop or Source", desc: "Browse ATG Mall, shop 1688/Taobao-style listings, or tell us what you need.", icon: "🛍️" },
  { title: "We Buy", desc: "ATG purchases from the supplier on your behalf once you approve pricing.", icon: "🧾" },
  { title: "Consolidate", desc: "Your items arrive at our China warehouse and can be combined into one shipment.", icon: "📦" },
  { title: "Ship", desc: "Choose air freight, sea freight or courier — priced and tracked transparently.", icon: "🚢" },
  { title: "Deliver", desc: "Your package clears and is delivered locally in Nigeria or Gambia.", icon: "🏠" },
];

export function HowItWorks() {
  return (
    <Section tone="sand">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="Shop → Source → Buy → Consolidate → Ship → Deliver"
          description="One platform handles every step between a product listing in China and a delivery at your door."
          align="center"
        />
        <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {steps.map((step, i) => (
            <div key={step.title} className="relative rounded-xl2 border border-navy-100 bg-white p-5 text-center shadow-card">
              <span className="absolute -top-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-navy-900 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <div className="mt-2 text-3xl">{step.icon}</div>
              <p className="mt-3 text-sm font-semibold text-navy-900">{step.title}</p>
              <p className="mt-1 text-xs text-navy-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
