import { LegalPage } from "@/components/legal/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prohibited Items",
  description: "Items ATG Mall will not source, purchase, warehouse or ship.",
};

export default function ProhibitedItemsPage() {
  return (
    <LegalPage
      title="Prohibited Items Policy"
      lastUpdated="September 2026"
      intro="To keep ATG Mall compliant with import regulations in Nigeria and Gambia, and to keep our customers, staff and carriers safe, we do not source, purchase, receive, consolidate or ship the categories of items below. This list is not exhaustive — customs authorities in your destination country may restrict additional items, and we reserve the right to refuse any item at our discretion."
    >
      <h2>1. Always prohibited</h2>
      <ul>
        <li>Firearms, ammunition, explosives, and weapon parts or replicas designed to resemble real weapons.</li>
        <li>Illegal drugs and drug paraphernalia, and any substances controlled under the laws of Nigeria or Gambia.</li>
        <li>Counterfeit currency, and items designed to defraud financial institutions.</li>
        <li>Live animals and endangered species products (including ivory, exotic skins, and similar items).</li>
        <li>Human remains or body parts.</li>
        <li>Radioactive, toxic, or otherwise hazardous materials.</li>
        <li>Child sexual abuse material or any content depicting exploitation of minors.</li>
        <li>Items infringing third-party intellectual property (counterfeit branded goods).</li>
      </ul>

      <h2>2. Restricted — require prior approval or documentation</h2>
      <p>
        The following categories may be shippable in some circumstances, but require prior written approval from our
        team and, in many cases, documentation such as permits, certificates, or safety data sheets. Contact support
        before ordering an item in these categories:
      </p>
      <ul>
        <li>Batteries shipped on their own (lithium batteries in particular are subject to strict carrier rules).</li>
        <li>Flammable, pressurized, or magnetic items.</li>
        <li>Prescription medication and medical devices.</li>
        <li>Agricultural products, seeds, and plant material.</li>
        <li>Precious metals, gemstones, and high-value jewelry.</li>
        <li>Publications or media restricted under the laws of Nigeria or Gambia.</li>
      </ul>

      <h2>3. What happens if a prohibited item is identified</h2>
      <p>
        If a prohibited or restricted item is identified at sourcing, purchase, warehouse receipt, or customs stage,
        we may decline to proceed with the order, hold the item, or, where required, surrender it to the relevant
        authority. Where an order is declined before purchase, any amount paid for that item is refunded; the
        product-cost portion of an order already purchased from a supplier may not be recoverable, consistent with
        our <a href="/legal/refund-policy">Refund Policy</a>.
      </p>

      <h2>4. Your responsibility</h2>
      <p>
        You are responsible for confirming that an item you ask us to source, buy, or ship is legal to import into
        your destination country. If you are unsure whether an item is permitted, contact support before placing a
        Shop for Me or Source a Product request.
      </p>
    </LegalPage>
  );
}
