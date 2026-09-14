import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { confirmBvnVerification, BVN_PENDING_COOKIE } from "@/lib/services/bvnVerificationService";

export const metadata: Metadata = { title: "Identity Verification" };
export const dynamic = "force-dynamic";

export default async function BvnCallbackPage() {
  const user = await requireUser();
  const reference = cookies().get(BVN_PENDING_COOKIE)?.value;

  // NIBSS's consent page redirects back here — this is where verification
  // is actually confirmed, same role as /checkout/callback for payments.
  const result = reference
    ? await confirmBvnVerification({ userId: user.id, reference })
    : { ok: false, error: "We couldn't find your verification session. Please try again." };

  return (
    <div className="card p-7 text-center">
      {result.ok ? (
        <>
          <h1 className="text-xl font-display font-bold text-navy-900">Identity verified</h1>
          <p className="mt-1 text-sm text-navy-500">
            Your BVN has been confirmed{result.verifiedName ? ` for ${result.verifiedName}` : ""}. Your monthly
            wallet deposit limit no longer applies.
          </p>
          {result.nameMatches === false && (
            <p className="mt-3 rounded-lg bg-gold-50 p-3 text-xs text-gold-700">
              Note: the name on your BVN record doesn&apos;t closely match your account name. Verification still
              completed, but this has been noted for review.
            </p>
          )}
        </>
      ) : (
        <>
          <h1 className="text-xl font-display font-bold text-navy-900">Verification didn&apos;t complete</h1>
          <p className="mt-1 text-sm text-navy-500">{result.error}</p>
        </>
      )}
      <Link href="/account/wallet" className="btn-primary mt-5 inline-block">
        Back to Wallet
      </Link>
    </div>
  );
}
