import { Container, Section } from "@/components/ui/Section";
import { Logo } from "@/components/ui/Logo";
import { peekMagicLinkToken } from "@/lib/auth/auth-service";
import { confirmMagicLinkAction } from "./actions";
import Link from "next/link";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "Continue to ATG Mall" };
export const dynamic = "force-dynamic";

export default async function ContinuePage({
  searchParams,
}: {
  searchParams: { token?: string; next?: string };
}) {
  const token = searchParams.token ?? "";
  const peek = token ? await peekMagicLinkToken(token) : null;

  return (
    <Section className="!py-16">
      <Container className="max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo dark size="hero" />
        </div>
        <div className="card p-7 text-center">
          {peek ? (
            <>
              <h1 className="text-xl font-display font-bold text-navy-900">Continue as {peek.email}?</h1>
              <p className="mt-1 text-sm text-navy-500">This will sign you in to your ATG Mall account.</p>
              <form action={confirmMagicLinkAction} className="mt-5">
                <input type="hidden" name="token" value={token} />
                {searchParams.next && <input type="hidden" name="next" value={searchParams.next} />}
                <SubmitButton className="btn-primary w-full">Continue</SubmitButton>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-display font-bold text-navy-900">This link is invalid or has expired</h1>
              <p className="mt-1 text-sm text-navy-500">
                Please <Link href="/login" className="font-medium text-atgblue-600">continue as a guest again</Link> from the sign-in page.
              </p>
            </>
          )}
        </div>
      </Container>
    </Section>
  );
}
