import { Container, Section, SectionHeading } from "@/components/ui/Section";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Your Shipment",
  description: "Track your ATG Mall shipment with your ATG tracking number.",
};

async function trackAction(formData: FormData) {
  "use server";
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
  if (trackingNumber) redirect(`/track/${encodeURIComponent(trackingNumber)}`);
}

export default function TrackPage() {
  return (
    <Section className="!py-16">
      <Container className="max-w-xl text-center">
        <SectionHeading
          eyebrow="Track Shipment"
          title="Where's my package?"
          description="Enter your ATG tracking number to see its full journey — from our China warehouse to your door."
          align="center"
        />
        <form action={trackAction} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            className="input flex-1"
            type="text"
            name="trackingNumber"
            required
            placeholder="e.g. ATG-NG-2026000123"
          />
          <button type="submit" className="btn-primary shrink-0">Track Shipment</button>
        </form>
      </Container>
    </Section>
  );
}
