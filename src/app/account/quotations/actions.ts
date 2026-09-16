"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { orderService } from "@/lib/services/orderService";
import { createCheckoutOtp, verifyCheckoutOtp } from "@/lib/services/otpService";
import { redirect } from "next/navigation";

type ResolvedQuotationAcceptance =
  | { ok: true; quotationId: string; destinationIso: string; addressId?: string }
  | { ok: false; error: string };

/** Re-checks the quotation still belongs to this user and is still pending — re-run at confirm-time, not just up front. */
export async function resolveQuotationAcceptance(userId: string, quotationId: string): Promise<ResolvedQuotationAcceptance> {
  const quotation = await db.quotation.findFirst({
    where: {
      id: quotationId,
      OR: [{ shopForMeRequest: { userId } }, { sourcingRequest: { userId } }],
      status: "PENDING",
    },
    include: { shopForMeRequest: true, sourcingRequest: true },
  });
  if (!quotation) return { ok: false, error: "Quotation not found or already processed" };

  const destinationIso = quotation.shopForMeRequest?.destinationIso ?? quotation.sourcingRequest?.destinationIso ?? "NG";
  const address = await db.address.findFirst({ where: { userId }, orderBy: { isDefault: "desc" } });

  return { ok: true, quotationId: quotation.id, destinationIso, addressId: address?.id };
}

/** Validates the quotation and emails a verification code — nothing is accepted yet. */
export async function initiateQuotationOtpAction(formData: FormData) {
  const user = await requireUser();
  const quotationId = String(formData.get("quotationId"));

  const resolved = await resolveQuotationAcceptance(user.id, quotationId);
  if (!resolved.ok) {
    redirect("/account/quotations?error=" + encodeURIComponent(resolved.error));
  }

  const { otpId } = await createCheckoutOtp({
    userId: user.id,
    email: user.email,
    purpose: "QUOTATION_ACCEPT",
    payload: { quotationId },
    actionDescription: "accept this quotation",
  });

  redirect(`/verify-otp?otpId=${otpId}`);
}

export interface ConfirmQuotationOtpResult {
  ok: boolean;
  error?: string;
}

/** Verifies the code, then — only then — re-checks and actually accepts the quotation. */
export async function confirmQuotationOtpAction(otpId: string, code: string): Promise<ConfirmQuotationOtpResult> {
  const user = await requireUser();
  const verified = await verifyCheckoutOtp({ otpId, code, userId: user.id });
  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }

  const payload = verified.payload as { quotationId: string };
  const resolved = await resolveQuotationAcceptance(user.id, payload.quotationId);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const { orderNumber } = await orderService.createOrderFromQuotation({
    quotationId: resolved.quotationId,
    destinationIso: resolved.destinationIso,
    addressId: resolved.addressId,
  });

  redirect(`/account/orders?justPlaced=${orderNumber}`);
}

export async function declineQuotationAction(formData: FormData) {
  const user = await requireUser();
  const quotationId = String(formData.get("quotationId"));

  await db.quotation.updateMany({
    where: {
      id: quotationId,
      OR: [{ shopForMeRequest: { userId: user.id } }, { sourcingRequest: { userId: user.id } }],
    },
    data: { status: "DECLINED" },
  });

  redirect("/account/quotations");
}
