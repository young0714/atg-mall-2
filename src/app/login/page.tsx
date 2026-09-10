import { Container, Section } from "@/components/ui/Section";
import { Field, Input } from "@/components/ui/Form";
import { Logo } from "@/components/ui/Logo";
import { loginAction } from "./actions";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  return (
    <Section className="!py-16">
      <Container className="max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo dark />
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
            <Field label="Password" htmlFor="password" required>
              <Input id="password" name="password" type="password" required />
            </Field>
            <button type="submit" className="btn-primary w-full">Sign In</button>
          </form>

          <p className="mt-5 text-center text-sm text-navy-500">
            New to ATG Mall? <Link href="/register" className="font-medium text-atgblue-600">Create an account</Link>
          </p>
        </div>

        <div className="mt-6 rounded-xl2 border border-navy-100 bg-sand-50 p-4 text-xs text-navy-500">
          <p className="font-semibold text-navy-700">Demo accounts (seed data)</p>
          <p className="mt-1">Customer: amaka.customer@example.com / Customer#2026</p>
          <p>Admin: admin@atgmall.com / AtgMall#2026</p>
        </div>
      </Container>
    </Section>
  );
}
