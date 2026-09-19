import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { Container, Section } from "@/components/ui/Section";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { AirtimeFlow } from "@/components/digital-services/AirtimeFlow";

export const metadata: Metadata = { title: "Airtime & Bundles" };
export const dynamic = "force-dynamic";

export default async function AirtimePage() {
  await requireUser();

  return (
    <PullToRefresh>
    <Section className="!py-12">
      <Container className="max-w-2xl">
        <Link href="/digital-services" className="text-sm text-atgblue-600">
          ← Back to Digital Services
        </Link>
        <h1 className="mb-6 mt-2 text-2xl font-display font-bold text-navy-900">Airtime &amp; Bundles</h1>
        <AirtimeFlow />
      </Container>
    </Section>
    </PullToRefresh>
  );
}
