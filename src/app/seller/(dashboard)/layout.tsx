import { requireSeller } from "@/lib/auth/current-user";
import { Container, Section } from "@/components/ui/Section";

export default async function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSeller();
  return (
    <Section className="!py-8">
      <Container>{children}</Container>
    </Section>
  );
}
