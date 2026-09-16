import "server-only";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

/**
 * App-lock PIN — a 4-digit local checkpoint on top of an already-valid
 * login session, not a replacement for one. Hashed with the same
 * bcrypt utility as the real password (a 4-digit space is small, but the
 * lockout below is what actually protects it — bcrypt just avoids storing
 * it as plaintext at rest).
 */

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface PinResult {
  ok: boolean;
  error?: string;
}

export async function setPin(userId: string, pin: string): Promise<void> {
  const pinHash = await hashPassword(pin);
  await db.user.update({
    where: { id: userId },
    data: { pinHash, pinEnabled: true, pinAttempts: 0, pinLockedUntil: null },
  });
}

/** Disabling also removes biometric unlock — both are the same "app lock" feature, on or off together. */
export async function disablePin(userId: string): Promise<void> {
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { pinHash: null, pinEnabled: false, pinAttempts: 0, pinLockedUntil: null },
    }),
    db.webAuthnCredential.deleteMany({ where: { userId } }),
  ]);
}

export async function verifyPin(userId: string, pin: string): Promise<PinResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { pinHash: true, pinEnabled: true, pinAttempts: true, pinLockedUntil: true },
  });
  if (!user || !user.pinEnabled || !user.pinHash) {
    return { ok: false, error: "PIN lock isn't enabled on this account." };
  }

  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000);
    return { ok: false, error: `Too many incorrect attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` };
  }

  const correct = await verifyPassword(pin, user.pinHash);
  if (!correct) {
    const attempts = user.pinAttempts + 1;
    const lockedOut = attempts >= MAX_ATTEMPTS;
    await db.user.update({
      where: { id: userId },
      data: {
        pinAttempts: lockedOut ? 0 : attempts,
        pinLockedUntil: lockedOut ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
      },
    });
    if (lockedOut) {
      return { ok: false, error: `Too many incorrect attempts. Try again in ${LOCKOUT_MINUTES} minutes.` };
    }
    const remaining = MAX_ATTEMPTS - attempts;
    return { ok: false, error: `Incorrect PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` };
  }

  await db.user.update({ where: { id: userId }, data: { pinAttempts: 0, pinLockedUntil: null } });
  return { ok: true };
}
