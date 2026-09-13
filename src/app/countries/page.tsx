import { Container, Section, SectionHeading } from "@/components/ui/Section";
import { getActiveDestinationCountries } from "@/lib/services/destinationCountryService";
import { isoToFlagEmoji } from "@/lib/constants";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Supported Countries — Worldwide Shipping",
  description:
    "See every destination country ATG Mall currently supports for checkout and delivery. Pick your country at checkout to see live shipping options and pricing.",
  openGraph: {
    title: "Supported Countries — Worldwide Shipping",
    description: "See every destination country ATG Mall currently supports for checkout and delivery. Pick your country at checkout to see live shipping options and pricing.",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Supported Countries — Worldwide Shipping",
    description: "See every destination country ATG Mall currently supports for checkout and delivery. Pick your country at checkout to see live shipping options and pricing.",
    images: ["/logo.png"],
  },
};

export const dynamic = "force-dynamic";

export default async function SupportedCountriesPage() {
  const countries = await getActiveDestinationCountries();

  const byRegion = new Map<string, typeof countries>();
  for (const c of countries) {
    const key = c.region ?? "Other destinations";
    byRegion.set(key, [...(byRegion.get(key) ?? []), c]);
  }

  return (
    <Section className="!py-12">
      <Container className="max-w-4xl">
        <SectionHeading
          eyebrow="Worldwide Shipping"
          title="Supported destination countries"
          description="ATG Mall is a worldwide marketplace — choose any of these destinations at checkout to see delivery options and pricing calculated for your product's origin, weight and shipping method. Nigeria and Gambia remain our deepest, most established markets. We add new destinations regularly."
        />

        <div className="mt-10 space-y-8">
          {[...byRegion.entries()].map(([region, list]) => (
            <div key={region}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-navy-400">{region}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-xl2 border border-navy-100 bg-white px-4 py-3 text-sm font-medium text-navy-800"
                  >
                    <span className="text-lg">{isoToFlagEmoji(c.isoCode)}</span>
                    {c.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {countries.length === 0 && (
          <div className="mt-10 rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
            No destination countries configured yet.
          </div>
        )}

        <div className="mt-10 rounded-xl2 border border-gold-200 bg-gold-50 p-4 text-sm text-gold-700">
          <strong>Note:</strong> shipping availability and cost depend on the product&apos;s origin, destination,
          package size and selected shipping method — not every product ships to every destination on this list.{" "}
          <Link href="/shop-for-me" className="underline">
            Ask us
          </Link>{" "}
          if you&apos;re not sure whether we can get a specific item to you.
        </div>
      </Container>
    </Section>
  );
}
