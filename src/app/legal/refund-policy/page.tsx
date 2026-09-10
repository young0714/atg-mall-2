import { LegalPage } from "@/components/legal/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "When and how refunds are issued on ATG Mall.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      lastUpdated="September 2026"
      intro="Because most ATG Mall orders involve purchasing physical goods from a supplier on your behalf, refund eligibility depends on how far your order has progressed."
    >
      <h2>1. Before a supplier purchase is made</h2>
      <p>
        If you cancel an order, Shop for Me request, or an accepted quotation <strong>before</strong> we have
        purchased the item from the supplier, you are entitled to a full refund of any amount already paid, credited
        back to your original payment method or ATG Wallet.
      </p>

      <h2>2. After a supplier purchase is made</h2>
      <p>
        Once we have purchased an item from a supplier on your behalf, the product cost portion is generally
        non-refundable, because it has already been paid out to a third party. Our service fee may still be
        refundable at our discretion if the order has not yet shipped. If a supplier is unable to fulfil an order
        after purchase, we will work to secure a refund from the supplier and pass on what is recovered.
      </p>

      <h2>3. Damaged, incorrect or missing items</h2>
      <p>
        All packages are inspected on arrival at our warehouse. If an item arrives damaged, is materially different
        from what was ordered, or a package received differs from what the supplier confirmed was shipped, contact
        support with your order or package reference within 7 days of the warehouse receipt or delivery being logged
        on your account. We will investigate with the supplier and/or carrier and, where the issue is confirmed,
        offer a refund, replacement, or wallet credit as appropriate.
      </p>

      <h2>4. Shipping and customs charges</h2>
      <p>
        International shipping fees are generally non-refundable once a shipment has been dispatched, except where
        the delay or loss is caused by an error on our part. Customs duties or clearance charges paid to a customs
        authority are not refundable by ATG Mall.
      </p>

      <h2>5. Lost shipments</h2>
      <p>
        If a shipment is confirmed lost in transit by our shipping partner, we will refund the value of the affected
        items and shipping charges paid for that shipment, or offer to re-source and re-ship the items, at your
        choice, subject to the outcome of any claim with the carrier.
      </p>

      <h2>6. How refunds are paid</h2>
      <p>
        Approved refunds are credited to your ATG Wallet by default so they can be used immediately toward a new
        order, or paid back to your original payment method where that is not practical, at our discretion. Refunds
        typically appear in your Wallet transaction history immediately once issued by our team.
      </p>

      <h2>7. Requesting a refund</h2>
      <p>
        Open a support ticket from your account with your order, package or shipment reference. Our team reviews
        refund requests case by case, since every cross-border order sits at a different stage of purchase,
        consolidation or shipping.
      </p>
    </LegalPage>
  );
}
