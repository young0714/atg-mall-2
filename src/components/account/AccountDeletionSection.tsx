"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestAccountDeletionAction } from "@/app/account/security/actions";

/**
 * Deliberately its own small component, not folded into SecuritySettings —
 * this is a one-way door (disables the account immediately), so it gets its
 * own explicit confirm step rather than living alongside routine toggles.
 */
export function AccountDeletionSection() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    const result = await requestAccountDeletionAction();
    if (result.ok) {
      router.push("/");
      router.refresh();
    } else {
      setSubmitting(false);
      setError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="rounded-xl2 border border-red-200 bg-red-50 p-5">
      <h2 className="font-semibold text-red-900">Delete account</h2>
      <p className="mt-1 text-sm text-red-700">
        This disables your account immediately and signs you out everywhere. Your personal details are permanently
        removed within 7 business days; order and payment records are kept, but no longer linked to your name or
        contact details, as required for our accounting records.
      </p>

      {error && <p className="mt-3 text-sm font-medium text-red-800">{error}</p>}

      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} className="btn-outline mt-4 border-red-300 text-red-700 hover:bg-red-100">
          Request account deletion
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-red-900">Are you sure? This can&apos;t be undone from your account.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="btn-outline" disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {submitting ? "Deleting…" : "Yes, delete my account"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
