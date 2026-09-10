import { Container, Section, SectionHeading } from "@/components/ui/Section";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { submitSourcingRequestAction } from "./actions";
import { getDestination } from "@/lib/destination";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Source A Product — Let our team find it for you",
  description: "Can't find a supplier? Tell ATG Mall what you need and our sourcing team will find verified options and quotes.",
};

export default function SourceAProductPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const destination = getDestination();

  return (
    <Section className="!py-12">
      <Container className="max-w-2xl">
        <SectionHeading
          eyebrow="Source a Product"
          title="Tell us what you need. We'll find it."
          description="Describe the product — even without a link — and our sourcing team will search verified suppliers and come back with options, pricing, MOQ and estimated shipping."
        />

        {searchParams.error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
        )}

        <form action={submitSourcingRequestAction} className="card mt-8 space-y-4 p-6" encType="multipart/form-data">
          <Field label="Product name / description" htmlFor="productName" required>
            <Input id="productName" name="productName" required placeholder="e.g. Industrial sewing machine, heavy duty" />
          </Field>
          <Field label="Reference product link" htmlFor="productUrl" hint="Optional — a similar product you found online">
            <Input id="productUrl" name="productUrl" type="url" />
          </Field>
          <Field label="Upload a reference image" htmlFor="productImageFile" hint="Optional — JPEG/PNG/WEBP, up to 8MB">
            <input id="productImageFile" name="productImageFile" type="file" accept="image/*" className="input" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantity" htmlFor="quantity" required>
              <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} required />
            </Field>
            <Field label="Target price (USD, optional)" htmlFor="targetPriceMinor" hint="Enter whole dollars, e.g. 50">
              <Input id="targetPriceMinor" name="targetPriceMinor" type="number" min={0} step={1} />
            </Field>
          </div>
          <Field label="Delivery destination" htmlFor="destination" required>
            <Select id="destination" name="destination" defaultValue={destination.country} required>
              <option value="NIGERIA">🇳🇬 Nigeria</option>
              <option value="GAMBIA">🇬🇲 Gambia</option>
            </Select>
          </Field>
          <Field label="Additional notes" htmlFor="notes">
            <Textarea id="notes" name="notes" placeholder="Specifications, quality requirements, deadline, etc." />
          </Field>

          <button type="submit" className="btn-primary w-full">Submit Sourcing Request</button>
          <p className="text-center text-xs text-navy-400">
            Our sourcing team typically responds with supplier options within 1–3 business days.
          </p>
        </form>
      </Container>
    </Section>
  );
}
