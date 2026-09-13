import "server-only";
import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import type { RegisterInput, LoginInput } from "@/lib/validation/schemas";
import { isActiveDestinationIso, currencyForDestinationIso } from "@/lib/services/destinationCountryService";

export class AuthError extends Error {}

const MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function registerUser(input: RegisterInput) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AuthError("An account with this email already exists.");

  if (!(await isActiveDestinationIso(input.countryIso))) {
    throw new AuthError("Select a valid country.");
  }

  const passwordHash = await hashPassword(input.password);
  const currency = currencyForDestinationIso(input.countryIso);

  const user = await db.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
      passwordHash,
      role: "CUSTOMER",
      customerProfile: {
        create: {
          countryIso: input.countryIso,
          preferredCurrency: currency,
        },
      },
      wallet: {
        create: { currency, balanceMinor: 0 },
      },
    },
  });

  return user;
}

export type ProvisionGuestResult =
  | { status: "created"; user: Awaited<ReturnType<typeof db.user.create>> }
  | { status: "resend"; user: Awaited<ReturnType<typeof db.user.findUniqueOrThrow>> };

/**
 * Guest checkout entry point. A brand-new email gets a real (but
 * password-less) account and an immediate session — the same trust level
 * as normal registration, which also never verifies email ownership.
 * An email that already belongs to an existing guest does NOT get an
 * immediate session (that would let anyone into that guest's account just
 * by knowing their email) — the caller must send a fresh magic link
 * instead. An email with a real password already set is rejected outright.
 */
export async function provisionGuestUser(input: {
  fullName: string;
  email: string;
  countryIso: string;
}): Promise<ProvisionGuestResult> {
  const existing = await db.user.findUnique({ where: { email: input.email } });

  if (existing) {
    if (!existing.isGuest) {
      throw new AuthError("An account with this email already exists. Please sign in.");
    }
    return { status: "resend", user: existing };
  }

  const currency = currencyForDestinationIso(input.countryIso);
  const throwawayPassword = randomBytes(24).toString("hex");
  const passwordHash = await hashPassword(throwawayPassword);

  const user = await db.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      passwordHash,
      role: "CUSTOMER",
      isGuest: true,
      customerProfile: {
        create: {
          countryIso: input.countryIso,
          preferredCurrency: currency,
        },
      },
      wallet: {
        create: { currency, balanceMinor: 0 },
      },
    },
  });

  return { status: "created", user };
}

/**
 * Mints a one-time login link token for a guest, invalidating any prior
 * unused tokens first so only the most recently emailed link is ever live.
 * Returns null (mints nothing, sends nothing) if a still-valid token
 * already exists, so repeatedly submitting someone else's email can't be
 * used to spam their inbox.
 */
export async function createMagicLinkToken(userId: string): Promise<string | null> {
  const stillValid = await db.magicLinkToken.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (stillValid) return null;

  await db.magicLinkToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const rawToken = randomBytes(32).toString("hex");
  await db.magicLinkToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
    },
  });

  return rawToken;
}

/** Consumes a magic-link token, returning the user it authorizes or null if invalid/expired/used/disabled. */
/** Read-only check, for rendering the click-through confirmation page without consuming the token. */
export async function peekMagicLinkToken(rawToken: string): Promise<{ email: string } | null> {
  const tokenHash = hashToken(rawToken);
  const token = await db.magicLinkToken.findUnique({ where: { tokenHash }, include: { user: true } });

  if (!token || token.usedAt || token.expiresAt < new Date() || !token.user.isActive) {
    return null;
  }

  return { email: token.user.email };
}

export async function consumeMagicLinkToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const token = await db.magicLinkToken.findUnique({ where: { tokenHash }, include: { user: true } });

  if (!token || token.usedAt || token.expiresAt < new Date() || !token.user.isActive) {
    return null;
  }

  await db.magicLinkToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });

  return token.user;
}

export async function authenticateUser(input: LoginInput) {
  const user = await db.user.findUnique({ where: { email: input.email } });
  if (!user) throw new AuthError("Invalid email or password.");
  if (!user.isActive) throw new AuthError("This account has been disabled. Contact support.");

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new AuthError("Invalid email or password.");

  return user;
}
