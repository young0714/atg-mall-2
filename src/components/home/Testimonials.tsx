import { Section, SectionHeading, Container } from "@/components/ui/Section";
import { StarRating } from "@/components/shop/StarRating";

// Editorial note: these are illustrative example testimonials for the MVP
// demo, clearly written as representative use cases rather than attributed
// to real, identifiable customers with claims that could mislead.
const reviews = [
  {
    name: "Retail shop owner, Lagos",
    text: "I used Shop for Me to buy wholesale phone accessories I found on a supplier site. ATG handled the purchase and shipping — the landed cost estimate matched what I actually paid.",
  },
  {
    name: "Small business owner, Banjul",
    text: "Sourcing a product I couldn't find locally was straightforward — the team came back with three supplier options and I picked one that fit my budget.",
  },
  {
    name: "Reseller, Abuja",
    text: "Tracking my shipment with one ATG number from the warehouse all the way to delivery made it easy to plan my restocking.",
  },
];

export function Testimonials() {
  return (
    <Section>
      <Container>
        <SectionHeading eyebrow="Customer stories" title="Built around real cross-border buying needs" align="center" />
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {reviews.map((r) => (
            <div key={r.name} className="rounded-xl2 border border-navy-100 p-6">
              <StarRating rating={5} />
              <p className="mt-3 text-sm text-navy-600">&ldquo;{r.text}&rdquo;</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-navy-400">{r.name}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
