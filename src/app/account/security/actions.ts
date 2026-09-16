"use server";

import { requireUser } from "@/lib/auth/current-user";
import { setPin, disablePin, verifyPin } from "@/lib/services/pinService";
import {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  listCredentials,
  removeCredential,
} from "@/lib/services/webauthnService";
import { createCheckoutOtp, verifyCheckoutOtp } from "@/lib/services/otpService";
import { pinSchema } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from "@simplewebauthn/server";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function setPinAction(pin: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = pinSchema.safeParse(pin);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a 4-digit PIN" };

  await setPin(user.id, parsed.data);
  revalidatePath("/account/security");
  return { ok: true };
}

export async function disablePinLockAction(): Promise<ActionResult> {
  const user = await requireUser();
  await disablePin(user.id);
  revalidatePath("/account/security");
  return { ok: true };
}

/** Used by the lock screen — the real session is still valid underneath; this only checks the local PIN. */
export async function verifyPinUnlockAction(pin: string): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = pinSchema.safeParse(pin);
  if (!parsed.success) return { ok: false, error: "Enter a 4-digit PIN" };
  return verifyPin(user.id, parsed.data);
}

export interface WebAuthnOptionsResult {
  ok: boolean;
  options?: unknown;
  error?: string;
}

export async function startWebAuthnRegistrationAction(): Promise<WebAuthnOptionsResult> {
  const user = await requireUser();
  const options = await getRegistrationOptions(user.id, user.email);
  return { ok: true, options };
}

export interface RegisterDeviceResult {
  ok: boolean;
  credentialRowId?: string;
  error?: string;
}

export async function finishWebAuthnRegistrationAction(
  response: RegistrationResponseJSON,
  deviceLabel?: string,
): Promise<RegisterDeviceResult> {
  const user = await requireUser();
  const result = await verifyRegistration(user.id, response, deviceLabel);
  if (result.ok) revalidatePath("/account/security");
  return result;
}

/** Used by the lock screen to try biometric first — null options means no device is enrolled, caller falls back to the PIN pad. */
export async function startWebAuthnAuthenticationAction(): Promise<WebAuthnOptionsResult> {
  const user = await requireUser();
  const options = await getAuthenticationOptions(user.id);
  return { ok: options !== null, options: options ?? undefined, error: options ? undefined : "No biometric device enrolled." };
}

export async function finishWebAuthnAuthenticationAction(response: AuthenticationResponseJSON): Promise<ActionResult> {
  const user = await requireUser();
  return verifyAuthentication(user.id, response);
}

export async function listWebAuthnDevicesAction() {
  const user = await requireUser();
  return listCredentials(user.id);
}

export async function removeWebAuthnDeviceAction(credentialRowId: string): Promise<ActionResult> {
  const user = await requireUser();
  await removeCredential(user.id, credentialRowId);
  revalidatePath("/account/security");
  return { ok: true };
}

export interface InitiatePinResetResult {
  ok: boolean;
  otpId?: string;
  email?: string;
  error?: string;
}

/** "Forgot PIN" — the real session is still valid, so this just re-confirms email ownership before letting them set a new PIN. */
export async function initiatePinResetOtpAction(): Promise<InitiatePinResetResult> {
  const user = await requireUser();
  const { otpId } = await createCheckoutOtp({
    userId: user.id,
    email: user.email,
    purpose: "PIN_RESET",
    payload: {},
    actionDescription: "reset your app-lock PIN",
  });
  return { ok: true, otpId, email: user.email };
}

export async function confirmPinResetOtpAction(otpId: string, code: string, newPin: string): Promise<ActionResult> {
  const user = await requireUser();
  const verified = await verifyCheckoutOtp({ otpId, code, userId: user.id });
  if (!verified.ok) return { ok: false, error: verified.error };

  const parsed = pinSchema.safeParse(newPin);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a 4-digit PIN" };

  await setPin(user.id, parsed.data);
  return { ok: true };
}
