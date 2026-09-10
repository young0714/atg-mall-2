import { oneSixEightEightProductService } from "@/lib/services/oneSixEightEightProductService";
import { RemoteListingGrid } from "@/components/shop/RemoteListingGrid";
import { Container, Section, SectionHeading } from "@/components/ui/Section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "1688 — Shop wholesale from China",
  description: "Browse 1688-style wholesale listings and request a purchase through ATG Mall's Shop for Me service.",
};

export default async function OneSixEightEightPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const results = await oneSixEightEightProductService.search(searchParams.q ?? "");

  return (
    <Section className="!py-12">
      <Container>
        <SectionHeading
          eyebrow="1688"
          title="Wholesale listings from 1688"
          description="Mock listings for demonstration — pending an authorized 1688 API integration. Request any item via Shop for Me."
        />
        <form method="GET" className="mt-6 max-w-md">
          <input
            className="input"
            type="search"
            name="q"
            placeholder="Search 1688 mock listings..."
            defaultValue={searchParams.q}
          />
        </form>
        <div className="mt-8">
          <RemoteListingGrid items={results} />
        </div>
      </Container>
    </Section>
  );
}
