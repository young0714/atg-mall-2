import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { Container, Section, SectionHeading } from "@/components/ui/Section";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { StatusBadge } from "@/components/ui/Badge";
import { createSupportTicketAction } from "./actions";
import { formatDateTime } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with your ATG Mall orders, packages and shipments.",
};
export const dynamic = "force-dynamic";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: { created?: string; error?: string };
}) {
  const user = await getCurrentUser();
  const tickets = user
    ? await db.supportTicket.findMany({ where: { customerId: user.id }, orderBy: { createdAt: "desc" } })
    : [];

  return (
    <Section className="!py-12">
      <Container className="max-w-2xl">
        <SectionHeading
          eyebrow="Support"
          title="How can we help?"
          description="Reach our team directly, or open a support ticket if you're signed in."
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a href="tel:+2347043945345" className="card p-4 text-sm">
            <p className="font-semibold text-navy-800">Call / WhatsApp</p>
            <p className="text-navy-500">+234 704 394 5345</p>
          </a>
          <a href="mailto:support@apexterraglobal.com" className="card p-4 text-sm">
            <p className="font-semibold text-navy-800">Email</p>
            <p className="text-navy-500">support@apexterraglobal.com</p>
          </a>
        </div>

        {searchParams.created && (
          <div className="mt-6 rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
            Ticket {searchParams.created} created. Our support team will respond soon.
          </div>
        )}
        {searchParams.error && <div className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

        {user ? (
          <>
            <form action={createSupportTicketAction} className="card mt-8 space-y-4 p-6">
              <h2 className="font-semibold text-navy-900">Open a Support Ticket</h2>
              <Field label="Subject" htmlFor="subject" required><Input id="subject" name="subject" required /></Field>
              <Field label="Message" htmlFor="message" required><Textarea id="message" name="message" required /></Field>
              <button type="submit" className="btn-primary w-full">Submit Ticket</button>
            </form>

            {tickets.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 font-semibold text-navy-900">Your Tickets</h2>
                <div className="space-y-2">
                  {tickets.map((t) => (
                    <div key={t.id} className="card flex items-center justify-between p-4 text-sm">
                      <div>
                        <p className="font-medium text-navy-800">{t.subject}</p>
                        <p className="text-xs text-navy-400">{t.ticketNumber} · {formatDateTime(t.createdAt)}</p>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-8 text-sm text-navy-500">
            <a href="/login?next=/support" className="font-medium text-atgblue-600 underline">Sign in</a> to open a support ticket.
          </p>
        )}
      </Container>
    </Section>
  );
}
