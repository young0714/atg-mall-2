import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { orderService } from "@/lib/services/orderService";
import { createCheckoutOtp, verifyCheckoutOtp } from "@/lib/services/otpService";
import { resolveQuotationAcceptance } from "@/app/account/quotations/actions";

/**
 * Two-step to match the OTP-gated web flow: a first call with no
 * otpId/code validates the quotation and emails a verification code; a
 * second call with {otpId, code} verifies it and only then places the
 * order. No accept happens on the first call.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const otpId = typeof body.otpId === "string" ? body.otpId : undefined;
  const code = typeof body.code === "string" ? body.code : undefined;

  if (otpId && code) {
    const verified = await verifyCheckoutOtp({ otpId, code, userId: user.id });
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: 400 });

    const payload = verified.payload as { quotationId: string };
    const resolved = await resolveQuotationAcceptance(user.id, payload.quotationId);
    if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 400 });

    const result = await orderService.createOrderFromQuotation({
      quotationId: resolved.quotationId,
      destinationIso: resolved.destinationIso,
      addressId: resolved.addressId,
    });

    return NextResponse.json({ data: result });
  }

  const resolved = await resolveQuotationAcceptance(user.id, params.id);
  if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: 404 });

  const { otpId: newOtpId } = await createCheckoutOtp({
    userId: user.id,
    email: user.email,
    purpose: "QUOTATION_ACCEPT",
    payload: { quotationId: resolved.quotationId },
    actionDescription: "accept this quotation",
  });

  return NextResponse.json({ data: { otpRequired: true, otpId: newOtpId } }, { status: 202 });
}
