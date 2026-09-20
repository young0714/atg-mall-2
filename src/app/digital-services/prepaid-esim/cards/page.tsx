import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { Container, Section } from "@/components/ui/Section";
import { GiftCardFlow } from "@/components/digital-services/GiftCardFlow";

export const metadata: Metadata = { title: "Prepaid Cards" };
export const dynamic = "force-dynamic";

export default async function PrepaidCardsPage() {
  await requireUser();

  return (
    <Section className="!py-12">
      <Container className="max-w-2xl">
        <Link href="/digital-services/prepaid-esim" className="text-sm text-atgblue-600">
          ← Back
        </Link>
        <h1 className="mb-1 mt-2 text-2xl font-display font-bold text-navy-900">Prepaid Cards</h1>
        <p className="mb-6 text-sm text-navy-500">Open-loop cards, usable online or in-store, not tied to one retailer.</p>
        <GiftCardFlow variant="prepaid" />
      </Container>
    </Section>
  );
}
