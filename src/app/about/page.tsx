import { Container, Section, SectionHeading } from "@/components/ui/Section";
import { Card, CardBody } from "@/components/ui/Card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About ATG Mall",
  description:
    "ATG Mall connects shoppers in Nigeria and Gambia to Chinese suppliers on 1688, Taobao and Alibaba — we source, buy, consolidate, ship and deliver.",
};

export default function AboutPage() {
  return (
    <>
      <Section className="!py-14">
        <Container className="max-w-3xl">
          <SectionHeading
            eyebrow="About ATG Mall"
            title="Shop global. Delivered local."
            description="ATG Mall makes it simple to shop from Chinese marketplaces and get your items home to Nigeria or Gambia — without needing a China-based agent, a freight forwarder, and a customs broker of your own."
          />

          <div className="legal-content mt-8">
            <h2>What we do</h2>
            <p>
              Millions of products on platforms like 1688, Taobao and Alibaba are priced for the Chinese domestic
              market and aren&apos;t easy to buy, pay for, or ship internationally on your own. ATG Mall handles the
              parts that are hard to do yourself:
            </p>
            <ul>
              <li><strong>Shop &amp; Source</strong> — browse products through ATG Mall, or send us a link or description of something you found elsewhere and we&apos;ll source it and quote you a landed cost.</li>
              <li><strong>Buy</strong> — we purchase from the supplier on your behalf once you approve pricing.</li>
              <li><strong>Consolidate</strong> — multiple purchases are received at our warehouse and can be combined into a single shipment to reduce your shipping cost.</li>
              <li><strong>Ship</strong> — we arrange international freight (air, sea or courier) to Nigeria or Gambia.</li>
              <li><strong>Deliver</strong> — your consolidated shipment clears and is delivered to a city we serve, or made available for pickup.</li>
            </ul>

            <h2>Who we are</h2>
            <p>
              ATG Mall is a product of <strong>Apex Terra Global Limited</strong>, a company registered in Nigeria.
              ATG Mall is a separate, dedicated consumer shopping and logistics platform — distinct from Apex Terra
              Global&apos;s corporate website at{" "}
              <a href="https://apexterraglobal.com" target="_blank" rel="noreferrer">apexterraglobal.com</a>.
            </p>
            <p>
              We are currently focused on serving customers in <strong>🇳🇬 Nigeria</strong> and <strong>🇬🇲 Gambia</strong>,
              with plans to expand to more markets over time.
            </p>

            <h2>How we&apos;re different</h2>
            <p>
              We show you an estimated landed cost — product price, service fee, and estimated shipping — before you
              commit, rather than surprising you with charges after your order has already left China. Every order,
              package and shipment can be tracked from purchase through to delivery on your ATG Mall account.
            </p>

            <h2>A word on accuracy</h2>
            <p>
              Product listings sourced through ATG Mall are based on supplier information and are not guaranteed to be
              error-free; landed cost estimates are estimates, not final invoices, until confirmed at checkout or
              quotation acceptance. See our <a href="/legal/terms">Terms &amp; Conditions</a> and{" "}
              <a href="/legal/shipping-policy">Shipping Policy</a> for full details.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="sand" className="!py-14">
        <Container className="grid gap-4 sm:grid-cols-3">
          <Card><CardBody><p className="text-sm font-semibold text-navy-800">Company</p><p className="mt-1 text-sm text-navy-500">Apex Terra Global Limited</p></CardBody></Card>
          <Card><CardBody><p className="text-sm font-semibold text-navy-800">Director</p><p className="mt-1 text-sm text-navy-500">Alabi Olasesan</p></CardBody></Card>
          <Card><CardBody><p className="text-sm font-semibold text-navy-800">Serving</p><p className="mt-1 text-sm text-navy-500">🇳🇬 Nigeria · 🇬🇲 Gambia</p></CardBody></Card>
        </Container>
      </Section>
    </>
  );
}
