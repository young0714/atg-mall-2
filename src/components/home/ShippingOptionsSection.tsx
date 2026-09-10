import { Section, SectionHeading, Container } from "@/components/ui/Section";
import { SHIPPING_METHOD_LABELS, SHIPPING_METHOD_DESCRIPTIONS } from "@/lib/constants";
import Link from "next/link";
import type { ShippingMethod } from "@prisma/client";

const methods: ShippingMethod[] = ["AIR_FREIGHT", "SEA_FREIGHT", "COURIER", "LCL", "FCL"];

export function ShippingOptionsSection() {
  return (
    <Section tone="sand">
      <Container>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Shipping options"
            title="Choose the shipping method that fits your order"
            description="Rates are set and maintained by ATG's logistics team — always calculated for your specific weight, volume and destination."
          />
          <Link href="/shop-for-me" className="btn-outline shrink-0">
            Get a shipping quote
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {methods.map((m) => (
            <div key={m} className="rounded-xl2 border border-navy-100 bg-white p-5">
              <p className="font-semibold text-navy-900">{SHIPPING_METHOD_LABELS[m]}</p>
              <p className="mt-1.5 text-xs text-navy-500">{SHIPPING_METHOD_DESCRIPTIONS[m]}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
