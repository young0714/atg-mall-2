import { taobaoProductService } from "@/lib/services/taobaoProductService";
import { RemoteListingGrid } from "@/components/shop/RemoteListingGrid";
import { Container, Section, SectionHeading } from "@/components/ui/Section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Taobao — Shop retail from China",
  description: "Browse Taobao-style retail listings and request a purchase through ATG Mall's Shop for Me service.",
};

export default async function TaobaoPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const results = await taobaoProductService.search(searchParams.q ?? "");

  return (
    <Section className="!py-12">
      <Container>
        <SectionHeading
          eyebrow="Taobao"
          title="Retail listings from Taobao"
          description="Mock listings for demonstration — pending an authorized Taobao API integration. Request any item via Shop for Me."
        />
        <form method="GET" className="mt-6 max-w-md">
          <input
            className="input"
            type="search"
            name="q"
            placeholder="Search Taobao mock listings..."
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
