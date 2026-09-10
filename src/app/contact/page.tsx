import { Container, Section, SectionHeading } from "@/components/ui/Section";
import { Card, CardBody } from "@/components/ui/Card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with ATG Mall — support for orders, packages, shipments and general enquiries.",
};

export default function ContactPage() {
  return (
    <Section className="!py-14">
      <Container className="max-w-3xl">
        <SectionHeading
          eyebrow="Contact Us"
          title="We're here to help"
          description="For order, package or shipment help, opening a support ticket from your account gets the fastest response since it's linked to your order history."
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardBody>
              <p className="text-sm font-semibold text-navy-800">Call / WhatsApp</p>
              <a href="tel:+2347043945345" className="mt-1 block text-navy-600 hover:text-atgblue-600">+234 704 394 5345</a>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm font-semibold text-navy-800">Email</p>
              <a href="mailto:support@apexterraglobal.com" className="mt-1 block text-navy-600 hover:text-atgblue-600">support@apexterraglobal.com</a>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm font-semibold text-navy-800">Support tickets</p>
              <a href="/support" className="mt-1 block text-navy-600 hover:text-atgblue-600">Open a ticket from your account →</a>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-sm font-semibold text-navy-800">Company</p>
              <p className="mt-1 text-navy-600">Apex Terra Global Limited, Nigeria</p>
            </CardBody>
          </Card>
        </div>

        <p className="mt-8 text-sm text-navy-500">
          ATG Mall is a product of Apex Terra Global Limited. For matters relating to Apex Terra Global&apos;s
          corporate business outside of ATG Mall, visit{" "}
          <a href="https://apexterraglobal.com" className="font-medium text-atgblue-600 underline" target="_blank" rel="noreferrer">
            apexterraglobal.com
          </a>.
        </p>
      </Container>
    </Section>
  );
}
