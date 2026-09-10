import { requireUser } from "@/lib/auth/current-user";
import { Container, Section } from "@/components/ui/Section";
import { AccountNav } from "@/components/account/AccountNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <Section className="!py-8">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <AccountNav />
          <div>{children}</div>
        </div>
      </Container>
    </Section>
  );
}
