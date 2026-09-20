import { LegalPage } from "@/components/legal/LegalPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Your Account",
  description: "How to request deletion of your ATG Mall account and data.",
};

export default function DeleteAccountPage() {
  return (
    <LegalPage
      title="Delete Your Account"
      lastUpdated="September 2026"
      intro="You can request deletion of your ATG Mall account and personal data at any time."
    >
      <h2>1. How to request deletion</h2>
      <p>
        Sign in to ATG Mall, go to <strong>Account → Security</strong>, and select{" "}
        <strong>Request Account Deletion</strong>. Your account is disabled immediately, and our team completes the
        deletion shortly after.
      </p>
      <p>
        If you can no longer sign in, email <a href="mailto:support@apexterraglobal.com">support@apexterraglobal.com</a>{" "}
        from the address on your account and ask us to delete it. We'll verify your identity before proceeding.
      </p>

      <h2>2. What gets deleted</h2>
      <p>
        Your name, email address, phone number, and any BVN verification record are permanently removed from our
        systems.
      </p>

      <h2>3. What we keep, and why</h2>
      <p>
        Order, payment, shipment and wallet transaction records are retained even after deletion, but not linked to your
        name or contact details anymore, but kept in our accounting and logistics records as required by tax,
        consumer-protection and anti-fraud law. This is the same reason a bank or shop can't erase a receipt just
        because you close your account with them.
      </p>

      <h2>4. Timeframe</h2>
      <p>
        Your account is disabled the moment you submit a request, so no one can sign in to it from that point on.
        The personal-data removal described above is completed within 7 business days.
      </p>
    </LegalPage>
  );
}
