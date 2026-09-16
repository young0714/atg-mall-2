import Link from "next/link";
import { Container, Section } from "@/components/ui/Section";
import { WalletTransferFlow } from "@/components/account/WalletTransferFlow";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Send Money" };
export const dynamic = "force-dynamic";

export default function SendMoneyPage() {
  return (
    <Section className="!py-10">
      <Container className="max-w-lg">
        <Link href="/account/wallet" className="text-sm text-atgblue-600">
          ← Back to Wallet
        </Link>
        <h1 className="mt-2 text-2xl font-display font-bold text-navy-900">Send Money</h1>
        <p className="mt-1 text-sm text-navy-500">Send from your ATG Wallet to another customer's wallet — instantly, no fees.</p>
        <div className="mt-6">
          <WalletTransferFlow />
        </div>
      </Container>
    </Section>
  );
}
