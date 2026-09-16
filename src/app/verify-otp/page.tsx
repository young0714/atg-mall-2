import { requireUser } from "@/lib/auth/current-user";
import { getOtpPurpose } from "@/lib/services/otpService";
import { redirect } from "next/navigation";
import { Container, Section } from "@/components/ui/Section";
import { VerifyOtpForm } from "@/components/checkout/VerifyOtpForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verify" };
export const dynamic = "force-dynamic";

const BACK_HREF_BY_PURPOSE: Record<string, string> = {
  CHECKOUT: "/checkout",
  QUOTATION_ACCEPT: "/account/quotations",
};

export default async function VerifyOtpPage({ searchParams }: { searchParams: { otpId?: string } }) {
  const user = await requireUser();
  const otpId = searchParams.otpId;
  if (!otpId) redirect("/");

  const purpose = await getOtpPurpose(otpId, user.id);
  if (!purpose) redirect("/");

  return (
    <Section className="!py-10">
      <Container className="max-w-lg">
        <VerifyOtpForm email={user.email} otpId={otpId} backHref={BACK_HREF_BY_PURPOSE[purpose] ?? "/"} />
      </Container>
    </Section>
  );
}
