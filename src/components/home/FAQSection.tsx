import { Section, SectionHeading, Container } from "@/components/ui/Section";

const faqs = [
  {
    q: "Which countries does ATG Mall deliver to?",
    a: "ATG Mall currently serves Nigeria and Gambia, with delivery zones covering major cities including Lagos, Abuja, Port Harcourt, Kano and Ibadan in Nigeria, and Banjul, Kanifing and Brikama in Gambia.",
  },
  {
    q: "Can I buy directly from 1688 or Taobao through ATG Mall?",
    a: "We're building toward full 1688 and Taobao integration. Today, use Shop for Me to send us a product link and we'll purchase it on your behalf, or browse our catalog of already-sourced items.",
  },
  {
    q: "How is my landed cost calculated?",
    a: "Landed cost = product price + China domestic shipping to our warehouse + international shipping + ATG's service fee. You'll always see this breakdown before paying.",
  },
  {
    q: "What if I don't know exactly what shipping will cost?",
    a: "Use our shipping calculator or submit a Shop for Me / Source a Product request — our team will confirm exact weight and dimensions once your item is at our warehouse.",
  },
  {
    q: "How do I track my order?",
    a: "Every order that ships gets an ATG tracking number (e.g. ATG-NG-2026000123). Enter it on our Track Shipment page for a full status timeline.",
  },
  {
    q: "Is ATG Mall the same as Apex Terra Global's corporate website?",
    a: "No. ATG Mall is a separate consumer shopping platform. Apex Terra Global Limited is the parent company that operates it, and also runs apexterraglobal.com as its corporate site.",
  },
];

export function FAQSection() {
  return (
    <Section tone="sand">
      <Container className="max-w-4xl">
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" align="center" />
        <div className="mt-10 divide-y divide-navy-100 rounded-xl2 border border-navy-100 bg-white">
          {faqs.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-navy-900">
                {f.q}
                <span className="ml-4 shrink-0 text-navy-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-navy-500">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
