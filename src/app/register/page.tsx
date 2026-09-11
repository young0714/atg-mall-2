import { Container, Section } from "@/components/ui/Section";
import { Field, Input, Select } from "@/components/ui/Form";
import { Logo } from "@/components/ui/Logo";
import { registerAction } from "./actions";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create Account" };

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <Section className="!py-16">
      <Container className="max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo dark size="hero" />
        </div>
        <div className="card p-7">
          <h1 className="text-xl font-display font-bold text-navy-900">Create your ATG Mall account</h1>
          <p className="mt-1 text-sm text-navy-500">Start shopping, sourcing and shipping from China today.</p>

          {searchParams.error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
          )}

          <form action={registerAction} className="mt-5 space-y-4">
            <Field label="Full name" htmlFor="fullName" required>
              <Input id="fullName" name="fullName" required autoFocus />
            </Field>
            <Field label="Email address" htmlFor="email" required>
              <Input id="email" name="email" type="email" required />
            </Field>
            <Field label="Phone number" htmlFor="phone" required>
              <Input id="phone" name="phone" required placeholder="+234..." />
            </Field>
            <Field label="Country" htmlFor="country" required>
              <Select id="country" name="country" required>
                <option value="NIGERIA">🇳🇬 Nigeria</option>
                <option value="GAMBIA">🇬🇲 Gambia</option>
              </Select>
            </Field>
            <Field label="Password" htmlFor="password" required hint="At least 8 characters">
              <Input id="password" name="password" type="password" required minLength={8} />
            </Field>
            <button type="submit" className="btn-primary w-full">Create Account</button>
          </form>

          <p className="mt-5 text-center text-sm text-navy-500">
            Already have an account? <Link href="/login" className="font-medium text-atgblue-600">Sign in</Link>
          </p>
        </div>
      </Container>
    </Section>
  );
}
