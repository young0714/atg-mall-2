import "server-only";
import { db } from "@/lib/db";
import { matchNames } from "./nameMatchService";

/**
 * BVN identity verification via Flutterwave/NIBSS — Nigeria only. Unlike a
 * payment, this is a redirect-to-consent flow end to end: we ask Flutterwave
 * to start it, send the customer to a NIBSS-hosted page to grant consent and
 * approve an OTP there (never on our own pages — we never see or handle
 * their BVN's OTP), then retrieve the result when they return. No webhook
 * exists for this the way there is for payments, so the callback page is
 * the single source of truth for "verification actually completed."
 *
 * Only the outcome is ever stored (User.bvnVerifiedAt/bvnVerifiedName) —
 * never the BVN itself, which only ever appears in the one outbound request
 * to Flutterwave below.
 */

const FLUTTERWAVE_API = "https://api.flutterwave.com/v3";

// Carries the pending verification's reference across the NIBSS redirect —
// short-lived, cleared as soon as the callback reads it. Not sensitive (an
// opaque tracking ID, not the BVN), httpOnly out of general hygiene.
export const BVN_PENDING_COOKIE = "atg_bvn_pending_ref";
export const BVN_PENDING_COOKIE_MAX_AGE = 60 * 30; // 30 minutes

export interface InitiateBvnResult {
  ok: boolean;
  consentUrl?: string;
  reference?: string;
  error?: string;
}

export async function initiateBvnVerification(params: {
  bvn: string;
  fullName: string;
  redirectUrl: string;
}): Promise<InitiateBvnResult> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "BVN verification isn't available right now." };

  // Flutterwave wants first/last name separately; fullName is one field
  // here, so this is a best-effort split, not a guarantee it matches NIBSS's
  // own name fields exactly — that's exactly what the verified response
  // gets cross-checked against afterward, not assumed correct up front.
  const nameParts = params.fullName.trim().split(/\s+/);
  const firstname = nameParts[0] ?? params.fullName;
  const lastname = nameParts.slice(1).join(" ") || nameParts[0];

  const res = await fetch(`${FLUTTERWAVE_API}/bvn/verifications`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ bvn: params.bvn, firstname, lastname, redirect_url: params.redirectUrl }),
  });
  const body = await res.json().catch(() => null);

  if (!res.ok || body?.status !== "success" || !body?.data?.url || !body?.data?.reference) {
    return { ok: false, error: body?.message || "Could not start BVN verification. Please try again." };
  }

  return { ok: true, consentUrl: body.data.url, reference: body.data.reference };
}

export interface ConfirmBvnResult {
  ok: boolean;
  verifiedName?: string;
  error?: string;
}

/**
 * The single source of truth for "BVN verification actually completed."
 * Called once, from the consent-return callback page. Idempotent — if this
 * user is already verified, returns success without calling Flutterwave
 * again (covers a reloaded or replayed callback).
 *
 * A completed NIBSS consent isn't enough on its own to lift the deposit
 * cap — the name NIBSS returns must also match the account's profile name
 * (see matchNames()). Unlike the bank-transfer name match, which is a soft
 * flag for admin review after the fact, this is a hard requirement: the cap
 * exists specifically to stop money moving through an unverified identity,
 * so a name that doesn't match defeats the point of verifying at all.
 */
export async function confirmBvnVerification(params: {
  userId: string;
  reference: string;
}): Promise<ConfirmBvnResult> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "BVN verification isn't available right now." };

  const user = await db.user.findUniqueOrThrow({ where: { id: params.userId } });
  if (user.bvnVerifiedAt) {
    return { ok: true, verifiedName: user.bvnVerifiedName ?? undefined };
  }

  const res = await fetch(`${FLUTTERWAVE_API}/bvn/verifications/${encodeURIComponent(params.reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const body = await res.json().catch(() => null);
  const data = body?.data;

  if (!res.ok || body?.status !== "success" || !data || data.status !== "COMPLETED") {
    return { ok: false, error: "Verification wasn't completed — you may have closed the page early. Please try again." };
  }

  const verifiedName = [data.first_name, data.middleName, data.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const { flagged } = matchNames(user.fullName, verifiedName || user.fullName);

  if (flagged) {
    return {
      ok: false,
      error: `The name on your BVN record (${verifiedName || "unknown"}) doesn't match your account name (${user.fullName}). Update your profile name to match your ID, or contact support if this looks wrong.`,
    };
  }

  await db.user.update({
    where: { id: user.id },
    data: { bvnVerifiedAt: new Date(), bvnVerifiedName: verifiedName || null },
  });

  return { ok: true, verifiedName };
}
