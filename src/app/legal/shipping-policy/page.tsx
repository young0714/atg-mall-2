import { LegalPage } from "@/components/legal/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: "How ATG Mall consolidates and ships packages to Nigeria and Gambia.",
};

export default function ShippingPolicyPage() {
  return (
    <LegalPage
      title="Shipping Policy"
      lastUpdated="September 2026"
      intro="This policy explains how consolidation, shipping methods, transit estimates and delivery work on ATG Mall."
    >
      <h2>1. Where we ship</h2>
      <p>
        ATG Mall currently ships to <strong>🇳🇬 Nigeria</strong> (including Lagos, Abuja, Port Harcourt, Kano, Ibadan,
        Benin City, Enugu and Kaduna) and <strong>🇬🇲 Gambia</strong> (including Banjul, Kanifing and Brikama). The
        cities and local delivery zones we serve are configured by our operations team and may be updated over time —
        your account will show the zones currently available for your destination.
      </p>

      <h2>2. Shipping methods</h2>
      <p>We offer a choice of shipping methods, shown with an estimated cost and transit window at checkout or quotation stage:</p>
      <ul>
        <li><strong>Air Freight</strong> — fastest option, best for lighter or urgent parcels.</li>
        <li><strong>Sea Freight (LCL/FCL)</strong> — most economical for heavy or bulky cargo, longer transit time.</li>
        <li><strong>Express Courier</strong> — door-to-door service for small, urgent parcels.</li>
      </ul>
      <p>
        Shipping costs are calculated from the weight and, where relevant, volumetric (dimensional) weight of your
        package(s), using rates configured by our team. These are not live carrier quotes and may be updated from
        time to time as our freight agreements change.
      </p>

      <h2>3. Warehouse receiving &amp; consolidation</h2>
      <p>
        When a supplier ships an item to our warehouse, we log its receipt, inspect it, and record its weight and
        dimensions. If you have multiple packages awaiting shipment, you can request that we consolidate them into a
        single shipment — this usually reduces your total shipping cost compared to shipping items separately, since
        international freight is priced by weight/volume.
      </p>

      <h2>4. Estimated transit times</h2>
      <p>
        Transit windows shown on ATG Mall (for example, "X–Y days") are estimates based on typical performance for
        that method and destination. Actual transit time can vary due to customs processing, weather, holidays,
        carrier capacity, and other factors outside our control. We are not able to guarantee an exact delivery date.
      </p>

      <h2>5. Customs clearance</h2>
      <p>
        Shipments into Nigeria and Gambia are subject to the customs laws and procedures of the destination country.
        Any applicable duties, taxes or clearance charges are the responsibility of the customer unless we state
        otherwise for a specific shipment. Clearance timelines are set by the relevant customs authority, not ATG
        Mall.
      </p>

      <h2>6. Tracking</h2>
      <p>
        Every shipment and package is assigned a tracking reference (for example, in the format{" "}
        <code>ATG-NG-2026000123</code> for orders or <code>ATG-PKG-000123</code> for packages), which you can look up
        under <a href="/track">Track Shipment</a> or from your account to see its full status history.
      </p>

      <h2>7. Final delivery</h2>
      <p>
        Once a shipment clears customs and reaches its destination city, it is delivered to the address on file for
        your order, or made available for pickup, depending on the delivery zone. Someone must be available to
        receive the delivery, or provide instructions for redelivery/pickup.
      </p>
    </LegalPage>
  );
}
