import "server-only";
import crypto from "crypto";
import { db } from "@/lib/db";

const MAX_ATTEMPTS = 10;

/** Generates a random 10-digit customer-facing wallet account number, retrying on the extremely rare collision. */
export async function generateUniqueAccountNumber(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = String(crypto.randomInt(1_000_000_000, 10_000_000_000));
    const existing = await db.wallet.findUnique({ where: { accountNumber: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique wallet account number after several attempts.");
}
