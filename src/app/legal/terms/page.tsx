import { LegalPage } from "@/components/legal/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms and conditions governing use of ATG Mall.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      lastUpdated="September 2026"
      intro="These Terms & Conditions ('Terms') govern your access to and use of ATG Mall, operated by Apex Terra Global Limited ('Apex Terra Global', 'we', 'us', 'our'). By creating an account or placing an order on ATG Mall, you agree to these Terms."
    >
      <h2>1. Who we are</h2>
      <p>
        ATG Mall is a cross-border shopping and logistics platform operated by Apex Terra Global Limited, a company
        registered in Nigeria. ATG Mall is a distinct consumer-facing product of Apex Terra Global Limited and is not
        itself a separate legal entity.
      </p>

      <h2>2. Our services</h2>
      <p>ATG Mall provides the following services, either directly or through third-party suppliers and logistics partners:</p>
      <ul>
        <li>Access to product listings sourced from Chinese marketplaces (including 1688 and Taobao) and from sellers on ATG Mall.</li>
        <li>"Shop for Me" — purchasing a specific product on your behalf from a link or description you provide.</li>
        <li>"Source a Product" — sourcing quotes for products you describe, which you may accept or decline.</li>
        <li>Receiving, inspecting and consolidating packages at our warehouse.</li>
        <li>Arranging international shipping to Nigeria and Gambia, and local delivery within the cities we serve.</li>
        <li>An ATG Wallet for holding funds you deposit to pay for orders, quotations and shipments.</li>
      </ul>
      <p>
        We act as an intermediary and logistics coordinator between you and suppliers, carriers and payment providers.
        We do not manufacture the products listed on the platform.
      </p>

      <h2>3. Accounts</h2>
      <p>
        You must provide accurate information when registering and keep your login credentials confidential. You are
        responsible for activity that occurs under your account. Tell us immediately if you suspect unauthorized use
        of your account.
      </p>

      <h2>4. Orders, quotations and pricing</h2>
      <p>
        Prices shown for catalog items, and estimates shown for Shop for Me and Source a Product requests, include an
        estimate of product cost, our service fee, and estimated shipping, converted to your local currency using an
        indicative exchange rate. These figures are <strong>estimates</strong> until you complete checkout or accept a
        quotation, at which point the amount charged is final for that order unless otherwise stated.
      </p>
      <p>
        Sourcing requests and Shop for Me requests are not binding orders until you approve a quotation. We may
        decline to fulfil a request or order at our discretion, including where a product cannot be sourced, is
        restricted from import, or pricing from the supplier changes materially.
      </p>

      <h2>5. Payments and the ATG Wallet</h2>
      <p>
        You may pay for orders by card, bank transfer, cash on delivery (where available), or from your ATG Wallet
        balance. Wallet deposits and debits are recorded as a running transaction history on your account. Wallet
        balances are not interest-bearing and are intended solely for use on ATG Mall.
      </p>

      <h2>6. Shipping, customs and delivery</h2>
      <p>
        Estimated transit times shown on the platform are estimates, not guarantees, and can be affected by customs
        clearance, weather, carrier delays and other factors outside our control. You are responsible for ensuring
        items you order are not prohibited or restricted from import into your destination country — see our{" "}
        <a href="/legal/prohibited-items">Prohibited Items</a> policy. Where applicable customs duties, levies or
        clearance charges apply, these are your responsibility unless we have stated otherwise for a specific order.
      </p>

      <h2>7. Cancellations and refunds</h2>
      <p>
        Cancellation eligibility depends on how far an order has progressed (for example, whether it has already been
        purchased from a supplier). See our <a href="/legal/refund-policy">Refund Policy</a> for full details.
      </p>

      <h2>8. Sellers on ATG Mall</h2>
      <p>
        Certain listings may be offered by independent sellers rather than sourced directly by ATG Mall. Sellers are
        subject to our <a href="/legal/seller-terms">Seller Terms</a> and are responsible for the accuracy of their
        own listings.
      </p>

      <h2>9. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use ATG Mall for any unlawful purpose, or to order, source or ship prohibited or restricted items.</li>
        <li>Provide false information when placing an order, sourcing request, or verifying your identity.</li>
        <li>Attempt to interfere with, reverse-engineer, or disrupt the platform or its underlying systems.</li>
        <li>Use another person&apos;s account or payment method without authorization.</li>
      </ul>

      <h2>10. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by applicable law, Apex Terra Global Limited&apos;s liability for any claim
        arising from your use of ATG Mall is limited to the amount you paid for the order, quotation or shipment
        giving rise to the claim. We are not liable for indirect or consequential losses, or for delays and losses
        caused by suppliers, carriers, customs authorities or events outside our reasonable control.
      </p>

      <h2>11. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of ATG Mall after changes take effect constitutes
        acceptance of the revised Terms. Material changes will be reflected by an updated "Last updated" date above.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws of the Federal Republic of Nigeria, without prejudice to any mandatory
        consumer protection laws applicable in your country of residence.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions about these Terms can be sent to{" "}
        <a href="mailto:support@apexterraglobal.com">support@apexterraglobal.com</a> or via our{" "}
        <a href="/contact">Contact page</a>.
      </p>
    </LegalPage>
  );
}
