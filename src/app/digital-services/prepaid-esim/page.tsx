import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { Container, Section } from "@/components/ui/Section";
import { PullToRefresh } from "@/components/ui/PullToRefresh";

export const metadata: Metadata = { title: "Prepaid & eSIM" };
export const dynamic = "force-dynamic";

export default async function PrepaidEsimPage() {
  await requireUser();

  return (
    <PullToRefresh>
    <Section className="!py-12">
      <Container className="max-w-2xl">
        <Link href="/digital-services" className="text-sm text-atgblue-600">
          ← Back to Digital Services
        </Link>
        <h1 className="mb-1 mt-2 text-2xl font-display font-bold text-navy-900">Prepaid &amp; eSIM</h1>
        <p className="mb-6 text-sm text-navy-500">What would you like to buy?</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/digital-services/prepaid-esim/cards" className="card p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-atgblue-50 text-lg">💳</div>
            <h3 className="font-semibold text-navy-900">Prepaid Cards</h3>
            <p className="mt-1 text-xs text-navy-500">Visa &amp; Mastercard prepaid cards, usable online or in-store worldwide.</p>
            <p className="mt-3 text-xs font-semibold text-atgblue-600">Browse cards →</p>
          </Link>
          <Link href="/digital-services/prepaid-esim/esim" className="card p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-atggreen-50 text-lg">📶</div>
            <h3 className="font-semibold text-navy-900">eSIM</h3>
            <p className="mt-1 text-xs text-navy-500">Get connected instantly in 190+ countries, no physical SIM needed.</p>
            <p className="mt-3 text-xs font-semibold text-atggreen-600">Browse eSIMs →</p>
          </Link>
        </div>
      </Container>
    </Section>
    </PullToRefresh>
  );
}
