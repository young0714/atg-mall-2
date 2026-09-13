import "server-only";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import type { RegisterInput, LoginInput } from "@/lib/validation/schemas";
import { isActiveDestinationIso, currencyForDestinationIso } from "@/lib/services/destinationCountryService";

export class AuthError extends Error {}

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

export async function authenticateUser(input: LoginInput) {
  const user = await db.user.findUnique({ where: { email: input.email } });
  if (!user) throw new AuthError("Invalid email or password.");
  if (!user.isActive) throw new AuthError("This account has been disabled. Contact support.");

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new AuthError("Invalid email or password.");

  return user;
}
