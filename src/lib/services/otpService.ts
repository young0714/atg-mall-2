import "server-only";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendTransactionalEmail } from "./notificationService";
import type { OtpPurpose, Prisma } from "@prisma/client";

/**
 * OtpService — the single gate every purchase-completing action goes
 * through. An action that used to execute immediately now only validates
 * its inputs and hands the validated (already-safe) payload here; the
 * actual purchase logic only runs once the emailed code is verified. See
 * the comment on the CheckoutOtp model for why this exists as one shared
 * mechanism rather than five separate ad hoc implementations.
 */

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function generateCode(): string {
  return crypto.randomInt(100000, 1000000).toString(); // always 6 digits
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export interface CreateOtpParams {
  userId: string;
  email: string;
  purpose: OtpPurpose;
  payload: Record<string, unknown>;
  /** Shown in the email body, e.g. "complete your order" / "top up airtime". */
  actionDescription: string;
}

export async function createCheckoutOtp(params: CreateOtpParams): Promise<{ otpId: string }> {
  const code = generateCode();

  const otp = await db.checkoutOtp.create({
    data: {
      userId: params.userId,
      email: params.email,
      purpose: params.purpose,
      codeHash: hashCode(code),
      payload: params.payload as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  await sendTransactionalEmail({
    to: params.email,
    subject: `Your ATG Mall verification code: ${code}`,
    body: `Use this code to ${params.actionDescription}: ${code}\n\nThis code expires in ${OTP_TTL_MINUTES} minutes. If you didn't request this, you can safely ignore this email.`,
  });

  return { otpId: otp.id };
}

/** Generates and sends a fresh code for an existing pending OTP, invalidating the old one. */
export async function resendCheckoutOtp(otpId: string, userId: string): Promise<{ otpId: string } | { error: string }> {
  const existing = await db.checkoutOtp.findUnique({ where: { id: otpId } });
  if (!existing || existing.userId !== userId || existing.verifiedAt) {
    return { error: "This verification session is no longer valid." };
  }

  const code = generateCode();
  const otp = await db.checkoutOtp.update({
    where: { id: otpId },
    data: {
      codeHash: hashCode(code),
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  await sendTransactionalEmail({
    to: otp.email,
    subject: `Your ATG Mall verification code: ${code}`,
    body: `Here's your new code: ${code}\n\nThis code expires in ${OTP_TTL_MINUTES} minutes. If you didn't request this, you can safely ignore this email.`,
  });

  return { otpId: otp.id };
}

/**
 * Reads an OTP's purpose without consuming an attempt or touching its
 * state — used by the generic /verify-otp page to decide which flow's
 * confirm action to call, before the real (attempt-consuming) verify runs.
 */
export async function getOtpPurpose(otpId: string, userId: string): Promise<OtpPurpose | null> {
  const otp = await db.checkoutOtp.findUnique({ where: { id: otpId } });
  if (!otp || otp.userId !== userId) return null;
  return otp.purpose;
}

export interface VerifyOtpResult {
  ok: boolean;
  purpose?: OtpPurpose;
  payload?: unknown;
  error?: string;
}

export async function verifyCheckoutOtp(params: { otpId: string; code: string; userId: string }): Promise<VerifyOtpResult> {
  const otp = await db.checkoutOtp.findUnique({ where: { id: params.otpId } });
  if (!otp || otp.userId !== params.userId) {
    return { ok: false, error: "Verification session not found. Please start again." };
  }
  if (otp.verifiedAt) {
    return { ok: false, error: "This code has already been used." };
  }
  if (otp.expiresAt < new Date()) {
    return { ok: false, error: "This code has expired. Please request a new one." };
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many incorrect attempts. Please request a new code." };
  }

  if (hashCode(params.code.trim()) !== otp.codeHash) {
    await db.checkoutOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    const remaining = MAX_ATTEMPTS - (otp.attempts + 1);
    return {
      ok: false,
      error: remaining > 0 ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` : "Too many incorrect attempts. Please request a new code.",
    };
  }

  await db.checkoutOtp.update({ where: { id: otp.id }, data: { verifiedAt: new Date() } });
  return { ok: true, purpose: otp.purpose, payload: otp.payload };
}
