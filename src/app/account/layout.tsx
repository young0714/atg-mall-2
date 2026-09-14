import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { Container, Section } from "@/components/ui/Section";
import { AccountNav } from "@/components/account/AccountNav";
import Link from "next/link";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unreadNotifications = await db.notification.count({ where: { userId: user.id, isRead: false } });
  return (
    <Section className="!py-8">
      <Container>
        {user.isGuest && (
          <div className="mb-6 flex flex-col items-start justify-between gap-2 rounded-xl2 border border-gold-200 bg-gold-50 p-4 text-sm text-gold-700 sm:flex-row sm:items-center">
            <p>You&apos;re shopping as a guest. Set a password to make it easier to sign in next time.</p>
            <Link href="/account/set-password" className="btn-outline btn-sm shrink-0">Set a password</Link>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr] lg:gap-6">
          <div className="space-y-3">
            <AccountNav unreadNotifications={unreadNotifications} />
            <form action="/api/v1/auth/logout" method="POST">
              <button className="w-full rounded-lg border border-red-100 px-3.5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                Sign out
              </button>
            </form>
          </div>
          <div>{children}</div>
        </div>
      </Container>
    </Section>
  );
}
