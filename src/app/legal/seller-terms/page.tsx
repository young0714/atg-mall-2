import { LegalPage } from "@/components/legal/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seller Terms",
  description: "Terms for sellers listing products on the ATG Mall marketplace.",
};

export default function SellerTermsPage() {
  return (
    <LegalPage
      title="Seller Terms"
      lastUpdated="September 2026"
      intro="These Seller Terms apply to any individual or business ('Seller') that lists products for sale on the ATG Mall marketplace, in addition to our general Terms & Conditions. The ATG Mall marketplace is being rolled out in phases — some capabilities described here may not yet be available to all sellers."
    >
      <h2>1. Becoming a seller</h2>
      <p>
        Sellers apply for a seller account and are subject to review and approval by ATG Mall before listings go
        live. We may suspend or reject a seller application at our discretion, including where information provided
        cannot be verified.
      </p>

      <h2>2. Listings</h2>
      <p>Sellers are responsible for the accuracy of their own listings, including:</p>
      <ul>
        <li>Product descriptions, images, pricing, and available quantity.</li>
        <li>Ensuring listed products are legal to sell and ship into Nigeria and Gambia (see our <a href="/legal/prohibited-items">Prohibited Items</a> policy).</li>
        <li>Not infringing the intellectual property or trademarks of others.</li>
      </ul>

      <h2>3. Order fulfilment</h2>
      <p>
        Sellers are expected to fulfil orders promptly and accurately, and to notify ATG Mall of any inventory or
        fulfilment issues affecting a placed order. Repeated failure to fulfil orders may result in listing removal
        or account suspension.
      </p>

      <h2>4. Commission and payouts</h2>
      <p>
        ATG Mall charges a commission on each sale made through a seller&apos;s listings, calculated as a percentage
        of the order value. Commission rates are communicated to sellers at onboarding and may vary by category.
        Payouts of a seller&apos;s net proceeds (order value less commission and any applicable fees) are made on a
        schedule communicated to sellers, subject to any pending disputes or refunds on the relevant orders.
      </p>

      <h2>5. Returns and disputes</h2>
      <p>
        Sellers must cooperate with ATG Mall in resolving customer complaints, refund requests, and disputes relating
        to their listings, consistent with our <a href="/legal/refund-policy">Refund Policy</a>.
      </p>

      <h2>6. Reviews</h2>
      <p>
        Sellers may not manipulate product reviews, including by offering incentives for positive reviews or
        submitting reviews for their own listings.
      </p>

      <h2>7. Suspension and termination</h2>
      <p>
        ATG Mall may suspend or terminate a seller account for breach of these Seller Terms, our general Terms &amp;
        Conditions, applicable law, or for conduct that harms customers or the platform.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these Seller Terms from time to time. Continued use of a seller account after changes take
        effect constitutes acceptance of the revised terms.
      </p>
    </LegalPage>
  );
}
