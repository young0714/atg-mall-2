"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/SubmitButton";

/**
 * Starts collapsed behind a "Verify Now" button so the wallet page doesn't
 * open with a live BVN input on screen — the form only appears once the
 * customer opts in.
 */
export function BvnVerifyForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} className="btn-outline w-full">
        Verify Now
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <Field label="Bank Verification Number (BVN)" htmlFor="bvn" required>
        <Input
          id="bvn"
          name="bvn"
          inputMode="numeric"
          pattern="\d{11}"
          maxLength={11}
          required
          placeholder="22212345678"
          autoFocus
        />
      </Field>
      <SubmitButton className="btn-outline w-full">Verify BVN</SubmitButton>
      <p className="text-center text-[11px] text-navy-400">
        You&apos;ll be taken to a secure NIBSS page to confirm your identity with an OTP. We never store your BVN —
        only the verification result.
      </p>
    </form>
  );
}
