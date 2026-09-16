"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmPurchaseOtpAction } from "@/lib/actions/otpActions";
import { OtpVerificationStep } from "@/components/digital-services/OtpVerificationStep";

export function VerifyOtpForm({ email, otpId: initialOtpId, backHref }: { email: string; otpId: string; backHref: string }) {
  const [otpId, setOtpId] = useState(initialOtpId);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  async function handleVerify(code: string) {
    setSubmitting(true);
    setErrorMsg(null);
    const result = await confirmPurchaseOtpAction(otpId, code);
    setSubmitting(false);
    // On success the action redirects server-side, so getting a result back at all means it didn't succeed.
    if (result && !result.ok) {
      setErrorMsg(result.error ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="card max-w-lg space-y-5 p-6">
      <div>
        <h1 className="text-lg font-bold text-navy-900">Verify to continue</h1>
        <p className="mt-1 text-sm text-navy-500">For your security, every order is confirmed with a one-time code.</p>
      </div>
      <OtpVerificationStep
        email={email}
        otpId={otpId}
        onOtpIdChange={setOtpId}
        onVerify={handleVerify}
        onBack={() => router.push(backHref)}
        submitting={submitting}
        errorMsg={errorMsg}
      />
    </div>
  );
}
