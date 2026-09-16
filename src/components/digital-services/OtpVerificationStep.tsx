"use client";

import { useState } from "react";
import { resendOtpAction } from "@/lib/actions/otpActions";

/**
 * Shared "enter the code we emailed you" step, reused by every purchase
 * flow (Airtime, Gift Cards, Bills — checkout/quotations use their own
 * server-rendered equivalent since they aren't client wizards). Resend
 * logic is identical everywhere, so it lives here rather than being
 * duplicated per flow.
 */
export function OtpVerificationStep({
  email,
  otpId,
  onOtpIdChange,
  onVerify,
  onBack,
  submitting,
  errorMsg,
}: {
  email: string;
  otpId: string;
  onOtpIdChange: (otpId: string) => void;
  onVerify: (code: string) => void;
  onBack: () => void;
  submitting: boolean;
  errorMsg: string | null;
}) {
  const [code, setCode] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function handleResend() {
    setResending(true);
    setResendMsg(null);
    const result = await resendOtpAction(otpId);
    setResending(false);
    if (result.ok && result.otpId) {
      onOtpIdChange(result.otpId);
      setResendMsg("A new code has been sent.");
    } else {
      setResendMsg(result.error ?? "Couldn't resend the code. Please try again.");
    }
  }

  return (
    <>
      <div>
        <p className="label mb-2">Enter verification code</p>
        <p className="mb-3 text-sm text-navy-500">
          We sent a 6-digit code to <span className="font-medium text-navy-700">{email}</span>. It expires in 10 minutes.
        </p>
        <input
          className="input text-center text-lg tracking-[0.3em]"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        />
      </div>

      {errorMsg && <p className="text-sm font-medium text-red-600">{errorMsg}</p>}
      {resendMsg && <p className="text-sm text-navy-500">{resendMsg}</p>}

      <button type="button" onClick={handleResend} disabled={resending} className="text-sm font-semibold text-atgblue-600">
        {resending ? "Resending…" : "Resend code"}
      </button>

      <div className="flex gap-2">
        <button className="btn-outline" onClick={onBack}>
          Back
        </button>
        <button className="btn-primary flex-1" disabled={code.length !== 6 || submitting} onClick={() => onVerify(code)}>
          {submitting ? "Verifying…" : "Verify & Pay"}
        </button>
      </div>
    </>
  );
}
