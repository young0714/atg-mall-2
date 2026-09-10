import "server-only";
import { db } from "@/lib/db";
import type { Currency, WalletTransactionType, Prisma } from "@prisma/client";

/**
 * WalletService — the ONLY code path allowed to change a wallet balance.
 * Every call appends a `WalletTransaction` row inside the same DB
 * transaction that updates the cached `Wallet.balanceMinor`, so the balance
 * is always reconstructable from the ledger. Never call `db.wallet.update`
 * on `balanceMinor` from anywhere else in the codebase.
 */

export interface WalletService {
  getOrCreateWallet(userId: string, currency: Currency): Promise<{ id: string; balanceMinor: number; currency: Currency }>;
  credit(params: {
    userId: string;
    amountMinor: number;
    type: Extract<WalletTransactionType, "DEPOSIT" | "REFUND" | "ADJUSTMENT">;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<void>;
  debit(params: {
    userId: string;
    amountMinor: number;
    description: string;
    referenceType?: string;
    referenceId?: string;
    type?: Extract<WalletTransactionType, "PAYMENT" | "ADJUSTMENT">;
  }): Promise<{ success: boolean; reason?: string }>;
}

class LedgerWalletService implements WalletService {
  async getOrCreateWallet(userId: string, currency: Currency) {
    const existing = await db.wallet.findUnique({ where: { userId } });
    if (existing) return existing;
    return db.wallet.create({ data: { userId, currency, balanceMinor: 0 } });
  }

  async credit({
    userId,
    amountMinor,
    type,
    description,
    referenceType,
    referenceId,
  }: {
    userId: string;
    amountMinor: number;
    type: Extract<WalletTransactionType, "DEPOSIT" | "REFUND" | "ADJUSTMENT">;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<void> {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      const balanceAfter = wallet.balanceMinor + amountMinor;
      await tx.wallet.update({ where: { userId }, data: { balanceMinor: balanceAfter } });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amountMinor,
          currency: wallet.currency,
          balanceAfterMinor: balanceAfter,
          referenceType,
          referenceId,
          description,
        },
      });
    });
  }

  async debit({
    userId,
    amountMinor,
    description,
    referenceType,
    referenceId,
    type = "PAYMENT",
  }: {
    userId: string;
    amountMinor: number;
    description: string;
    referenceType?: string;
    referenceId?: string;
    type?: Extract<WalletTransactionType, "PAYMENT" | "ADJUSTMENT">;
  }): Promise<{ success: boolean; reason?: string }> {
    return db.$transaction(async (tx: Prisma.TransactionClient) => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      if (wallet.balanceMinor < amountMinor) {
        return { success: false, reason: "INSUFFICIENT_FUNDS" };
      }
      const balanceAfter = wallet.balanceMinor - amountMinor;
      await tx.wallet.update({ where: { userId }, data: { balanceMinor: balanceAfter } });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amountMinor: -amountMinor,
          currency: wallet.currency,
          balanceAfterMinor: balanceAfter,
          referenceType,
          referenceId,
          description,
        },
      });
      return { success: true };
    });
  }
}

export const walletService: WalletService = new LedgerWalletService();
