import { Container, Section } from "@/components/ui/Section";
import { Field, Input } from "@/components/ui/Form";
import { Logo } from "@/components/ui/Logo";
import { loginAction, continueAsGuestAction } from "./actions";
import Link from "next/link";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; guestError?: string; guestLinkSent?: string; next?: string };
}) {
  return (
    <Section className="!py-16">
      <Container className="max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo dark size="hero" />
        </div>
        <div className="card p-7">
          <h1 className="text-xl font-display font-bold text-navy-900">Sign in to ATG Mall</h1>
          <p className="mt-1 text-sm text-navy-500">Access your orders, packages, wallet and more.</p>

          {searchParams.error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
          )}

          <form action={loginAction} className="mt-5 space-y-4">
            {searchParams.next && <input type="hidden" name="next" value={searchParams.next} />}
            <Field label="Email address" htmlFor="email" required>
              <Input id="email" name="email" type="email" required autoFocus />
            </Field>
            <div>
              <Field label="Password" htmlFor="password" required>
                <Input id="password" name="password" type="password" required />
              </Field>
              <Link href="/forgot-password" className="mt-1.5 inline-block text-xs font-medium text-atgblue-600">
                Forgot password?
              </Link>
            </div>
            <SubmitButton className="btn-primary w-full">Sign In</SubmitButton>
          </form>

          <p className="mt-5 text-center text-sm text-navy-500">
            New to ATG Mall?{" "}
            <Link href={searchParams.next ? `/register?next=${encodeURIComponent(searchParams.next)}` : "/register"} className="font-medium text-atgblue-600">
              Create an account
            </Link>
          </p>
        </div>

        <div className="card mt-6 p-7">
          <h2 className="text-lg font-display font-bold text-navy-900">Or continue as a guest</h2>
          <p className="mt-1 text-sm text-navy-500">
            No password needed, we&apos;ll email you a link to access your account and orders later.
          </p>

          {searchParams.guestError && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.guestError}</div>
          )}
          {searchParams.guestLinkSent && (
            <div className="mt-4 rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
              Check your email for a link to continue.
            </div>
          )}

          {!searchParams.guestLinkSent && (
            <form action={continueAsGuestAction} className="mt-5 space-y-4">
              {searchParams.next && <input type="hidden" name="next" value={searchParams.next} />}
              <Field label="Full name" htmlFor="guestFullName" required>
                <Input id="guestFullName" name="fullName" required />
              </Field>
              <Field label="Email address" htmlFor="guestEmail" required>
                <Input id="guestEmail" name="email" type="email" required />
              </Field>
              <SubmitButton className="btn-outline w-full">Continue as Guest</SubmitButton>
            </form>
          )}
        </div>
      </Container>
    </Section>
  );
}
