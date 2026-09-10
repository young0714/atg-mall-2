import { LegalPage } from "@/components/legal/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Agreement",
  description: "The agreement covering Shop for Me, Source a Product, warehousing and shipping services.",
};

export default function CustomerAgreementPage() {
  return (
    <LegalPage
      title="Customer Agreement"
      lastUpdated="September 2026"
      intro="This Customer Agreement sets out the specific understanding between you and Apex Terra Global Limited when you use ATG Mall's purchasing agent, warehousing and freight forwarding services (Shop for Me, Source a Product, package consolidation and shipping). It supplements, and should be read together with, our general Terms & Conditions."
    >
      <h2>1. Our role</h2>
      <p>
        When you submit a Shop for Me or Source a Product request, or place a catalog order that we purchase from a
        supplier on your behalf, ATG Mall acts as your <strong>purchasing agent</strong> for that transaction — we buy
        the item from the supplier in order to fulfil your instructions, and separately act as a{" "}
        <strong>freight forwarder</strong> in receiving, consolidating and shipping the resulting package(s) to you.
      </p>

      <h2>2. Quotations</h2>
      <p>
        Where a request requires sourcing (because pricing or availability isn&apos;t already known), we will provide
        one or more quotations reflecting the product cost, our service fee, and an estimated shipping cost. A
        quotation is only binding once you accept it; we are not obligated to purchase on your behalf until a
        quotation is accepted and paid for.
      </p>

      <h2>3. Authority to purchase</h2>
      <p>
        By accepting a quotation or completing checkout, you authorize us to purchase the specified item(s) from the
        named supplier, at the confirmed price, using funds you have paid or your ATG Wallet balance.
      </p>

      <h2>4. Warehousing</h2>
      <p>
        Once purchased, items are shipped by the supplier to our designated warehouse. We record their receipt,
        inspect them for obvious damage or discrepancy against what was ordered, and hold them pending your shipping
        instructions or automatic consolidation, depending on your account settings. We are not responsible for
        defects that are not reasonably visible on inspection at receipt.
      </p>

      <h2>5. Storage</h2>
      <p>
        Packages may be held at our warehouse for a reasonable period while awaiting consolidation or your shipping
        instructions. We reserve the right to apply storage handling terms communicated to you if a package remains
        unclaimed or without instructions for an extended period.
      </p>

      <h2>6. Shipping instructions</h2>
      <p>
        You may request that a package be shipped individually, or held for consolidation with other packages. Once
        you confirm shipping instructions and pay any applicable shipping cost, we arrange carriage to your
        destination in line with our <a href="/legal/shipping-policy">Shipping Policy</a>.
      </p>

      <h2>7. Fees</h2>
      <p>
        Our service fee for sourcing and purchasing agent services, and our shipping charges, are disclosed to you
        before you accept a quotation or confirm checkout. We do not add undisclosed fees after you have accepted a
        quotation, except for charges that are outside our control (such as customs duties assessed by a government
        authority).
      </p>

      <h2>8. Limitation of agency</h2>
      <p>
        As your purchasing agent, our responsibility is to place the order and forward the goods as instructed. We
        are not the manufacturer of sourced products and do not provide manufacturer-level warranties; any product
        warranty is limited to what the original supplier offers, where applicable.
      </p>

      <h2>9. Termination of a request</h2>
      <p>
        Either party may withdraw from a pending (not yet purchased) Shop for Me or Source a Product request at any
        time before purchase, subject to our <a href="/legal/refund-policy">Refund Policy</a>.
      </p>
    </LegalPage>
  );
}
