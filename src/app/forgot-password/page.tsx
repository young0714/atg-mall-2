import { Container, Section } from "@/components/ui/Section";
import { Field, Input } from "@/components/ui/Form";
import { Logo } from "@/components/ui/Logo";
import { requestPasswordResetAction } from "./actions";
import Link from "next/link";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; sent?: string };
}) {
  return (
    <Section className="!py-16">
      <Container className="max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo dark size="hero" />
        </div>
        <div className="card p-7">
          <h1 className="text-xl font-display font-bold text-navy-900">Reset your password</h1>
          <p className="mt-1 text-sm text-navy-500">
            Enter the email address on your account and we&apos;ll send you a link to set a new password.
          </p>

          {searchParams.error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
          )}

          {searchParams.sent ? (
            <div className="mt-4 rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
              If an account exists for that email, we&apos;ve sent a link to reset your password. Check your inbox.
            </div>
          ) : (
            <form action={requestPasswordResetAction} className="mt-5 space-y-4">
              <Field label="Email address" htmlFor="email" required>
                <Input id="email" name="email" type="email" required autoFocus />
              </Field>
              <SubmitButton className="btn-primary w-full">Send Reset Link</SubmitButton>
            </form>
          )}

          <p className="mt-5 text-center text-sm text-navy-500">
            <Link href="/login" className="font-medium text-atgblue-600">Back to sign in</Link>
          </p>
        </div>
      </Container>
    </Section>
  );
}
