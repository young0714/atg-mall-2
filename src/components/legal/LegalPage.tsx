import { Container, Section } from "@/components/ui/Section";

export function LegalPage({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <Section className="!py-12">
      <Container className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-atgblue-600">Legal</p>
        <h1 className="mt-2 text-3xl font-display font-bold text-navy-900">{title}</h1>
        <p className="mt-2 text-xs text-navy-400">Last updated: {lastUpdated}</p>
        {intro && <p className="mt-4 text-sm leading-relaxed text-navy-600">{intro}</p>}

        <div className="legal-content mt-8">{children}</div>
      </Container>
    </Section>
  );
}
