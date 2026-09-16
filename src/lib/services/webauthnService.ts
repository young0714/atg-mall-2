import "server-only";
import { cookies } from "next/headers";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { db } from "@/lib/db";

/**
 * Biometric app-unlock (Face ID/Touch ID/fingerprint/Windows Hello) via
 * WebAuthn — the web-platform standard that triggers the same on-device
 * biometric prompt a native app would use. The actual biometric data never
 * leaves the device; what's stored here is a public key, used only to
 * verify a signature came from that same enrolled device.
 *
 * Registration/authentication are both two-step (generate a challenge,
 * then verify what the browser signed with it), so the challenge has to
 * survive between those two requests. Stored in a short-lived httpOnly
 * cookie, same pattern as the real session cookie in session.ts.
 */

const CHALLENGE_COOKIE = "webauthn_challenge";
const CHALLENGE_TTL_SECONDS = 5 * 60;

function rpConfig() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const origin = appUrl;
  const rpID = new URL(appUrl).hostname;
  return { rpName: "ATG Mall", rpID, origin };
}

function setChallengeCookie(challenge: string) {
  cookies().set(CHALLENGE_COOKIE, challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

function consumeChallengeCookie(): string | null {
  const challenge = cookies().get(CHALLENGE_COOKIE)?.value ?? null;
  cookies().set(CHALLENGE_COOKIE, "", { path: "/", maxAge: 0 });
  return challenge;
}

export async function getRegistrationOptions(
  userId: string,
  email: string,
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { rpName, rpID } = rpConfig();
  const existing = await db.webAuthnCredential.findMany({ where: { userId }, select: { credentialId: true } });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: email,
    userID: new TextEncoder().encode(userId),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
    excludeCredentials: existing.map((c) => ({ id: c.credentialId })),
  });

  setChallengeCookie(options.challenge);
  return options;
}

export interface VerifyRegistrationResult {
  ok: boolean;
  credentialRowId?: string;
  error?: string;
}

export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  deviceLabel?: string,
): Promise<VerifyRegistrationResult> {
  const { rpID, origin } = rpConfig();
  const expectedChallenge = consumeChallengeCookie();
  if (!expectedChallenge) {
    return { ok: false, error: "This registration attempt expired. Please try again." };
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch {
    return { ok: false, error: "Could not verify that device. Please try again." };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: "Could not verify that device. Please try again." };
  }

  const { credential } = verification.registrationInfo;
  const row = await db.webAuthnCredential.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      deviceLabel: deviceLabel ?? null,
    },
  });

  return { ok: true, credentialRowId: row.id };
}

export async function getAuthenticationOptions(userId: string): Promise<PublicKeyCredentialRequestOptionsJSON | null> {
  const { rpID } = rpConfig();
  const credentials = await db.webAuthnCredential.findMany({ where: { userId }, select: { credentialId: true } });
  if (credentials.length === 0) return null;

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: credentials.map((c) => ({ id: c.credentialId })),
    userVerification: "required",
  });

  setChallengeCookie(options.challenge);
  return options;
}

export interface VerifyAuthenticationResult {
  ok: boolean;
  error?: string;
}

export async function verifyAuthentication(userId: string, response: AuthenticationResponseJSON): Promise<VerifyAuthenticationResult> {
  const { rpID, origin } = rpConfig();
  const expectedChallenge = consumeChallengeCookie();
  if (!expectedChallenge) {
    return { ok: false, error: "This unlock attempt expired. Please try again or use your PIN." };
  }

  const stored = await db.webAuthnCredential.findUnique({ where: { credentialId: response.id } });
  if (!stored || stored.userId !== userId) {
    return { ok: false, error: "That device isn't registered for this account." };
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.credentialId,
        publicKey: new Uint8Array(stored.publicKey),
        counter: Number(stored.counter),
      },
    });
  } catch {
    return { ok: false, error: "Could not verify that device. Please use your PIN." };
  }

  if (!verification.verified) {
    return { ok: false, error: "Could not verify that device. Please use your PIN." };
  }

  await db.webAuthnCredential.update({
    where: { id: stored.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() },
  });

  return { ok: true };
}

export async function listCredentials(userId: string) {
  return db.webAuthnCredential.findMany({
    where: { userId },
    select: { id: true, deviceLabel: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function removeCredential(userId: string, credentialRowId: string): Promise<void> {
  await db.webAuthnCredential.deleteMany({ where: { id: credentialRowId, userId } });
}
