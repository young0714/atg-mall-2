import { confirmFlutterwaveTransaction } from "@/lib/services/paymentService";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Wallet Top-Up" };
export const dynamic = "force-dynamic";

export default async function WalletCallbackPage({
  searchParams,
}: {
  searchParams: { status?: string; transaction_id?: string };
}) {
  // Same pattern as /checkout/callback — the webhook is the source of
  // truth; this page is a UX convenience that's safe to call twice.
  const cancelled = searchParams.status === "cancelled";
  const result =
    !cancelled && searchParams.transaction_id
      ? await confirmFlutterwaveTransaction(searchParams.transaction_id)
      : { ok: false };

  return (
    <div className="max-w-md space-y-4 text-center">
      {result.ok ? (
        <>
          <h1 className="text-xl font-display font-bold text-navy-900">Wallet funded</h1>
          <p className="text-sm text-navy-500">Your deposit has been added to your ATG Wallet.</p>
        </>
      ) : (
        <>
          <h1 className="text-xl font-display font-bold text-navy-900">
            {cancelled ? "Top-up cancelled" : "Deposit didn't go through"}
          </h1>
          <p className="text-sm text-navy-500">
            {cancelled
              ? "You cancelled the payment before it completed."
              : "We couldn't confirm this deposit. If you were charged, it may take a few minutes to reflect — check your wallet balance, or try again."}
          </p>
        </>
      )}
      <Link href="/account/wallet" className="btn-primary inline-block">
        View my wallet
      </Link>
    </div>
  );
}
