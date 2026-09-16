"use server";

import { requireUser } from "@/lib/auth/current-user";
import { resendCheckoutOtp, getOtpPurpose } from "@/lib/services/otpService";
import { confirmCheckoutOtpAction } from "@/app/checkout/actions";
import { confirmQuotationOtpAction } from "@/app/account/quotations/actions";

export interface ResendOtpResult {
  ok: boolean;
  otpId?: string;
  error?: string;
}

/** Shared across every purchase flow — resend logic doesn't depend on what's being purchased. */
export async function resendOtpAction(otpId: string): Promise<ResendOtpResult> {
  const user = await requireUser();
  const result = await resendCheckoutOtp(otpId, user.id);
  return "error" in result ? { ok: false, error: result.error } : { ok: true, otpId: result.otpId };
}

export interface ConfirmPurchaseOtpResult {
  ok: boolean;
  error?: string;
}

/**
 * Used by the generic /verify-otp page, which serves both main checkout and
 * quotation acceptance — those are traditional server-form flows, not
 * client wizards, so they share one verification page rather than each
 * getting its own. This reads the OTP's purpose (without consuming an
 * attempt) and dispatches to the matching flow's own confirm action, which
 * does the real (attempt-consuming) verification exactly once.
 */
export async function confirmPurchaseOtpAction(otpId: string, code: string): Promise<ConfirmPurchaseOtpResult> {
  const user = await requireUser();
  const purpose = await getOtpPurpose(otpId, user.id);
  if (!purpose) {
    return { ok: false, error: "This verification session is no longer valid." };
  }
  if (purpose === "CHECKOUT") {
    return confirmCheckoutOtpAction(otpId, code);
  }
  if (purpose === "QUOTATION_ACCEPT") {
    return confirmQuotationOtpAction(otpId, code);
  }
  return { ok: false, error: "Unsupported verification type." };
}
