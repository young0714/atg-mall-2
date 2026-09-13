import { requireUser } from "@/lib/auth/current-user";
import { Container, Section } from "@/components/ui/Section";
import { AccountNav } from "@/components/account/AccountNav";
import Link from "next/link";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <Section className="!py-8">
      <Container>
        {user.isGuest && (
          <div className="mb-6 flex flex-col items-start justify-between gap-2 rounded-xl2 border border-gold-200 bg-gold-50 p-4 text-sm text-gold-700 sm:flex-row sm:items-center">
            <p>You&apos;re shopping as a guest. Set a password to make it easier to sign in next time.</p>
            <Link href="/account/set-password" className="btn-outline btn-sm shrink-0">Set a password</Link>
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <AccountNav />
          <div>{children}</div>
        </div>
      </Container>
    </Section>
  );
}
