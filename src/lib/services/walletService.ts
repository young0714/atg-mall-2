import "server-only";
import { db } from "@/lib/db";
import { currencyConversionService } from "./currencyConversionService";
import { generateUniqueAccountNumber } from "./walletAccountNumberService";
import type { Currency, WalletTransactionType, Prisma } from "@prisma/client";

/**
 * WalletService — the ONLY code path allowed to change a wallet balance.
 * Every call appends a `WalletTransaction` row inside the same DB
 * transaction that updates the cached `Wallet.balanceMinor`, so the balance
 * is always reconstructable from the ledger. Never call `db.wallet.update`
 * on `balanceMinor` from anywhere else in the codebase.
 *
 * A wallet's own currency is fixed at creation and never changes on its
 * own — e.g. a customer updating their profile's country/currency later
 * must NOT retroactively relabel their existing balance (that would
 * silently change what the money is actually worth). Because of that, the
 * amount a caller wants to credit/debit is very often in a *different*
 * currency than the wallet itself (an order placed after a customer moved
 * countries, for example) — every credit/debit here takes the amount's own
 * currency and converts it to the wallet's currency before touching the
 * balance, rather than assuming they already match.
 */

export interface WalletService {
  getOrCreateWallet(
    userId: string,
    currency: Currency,
  ): Promise<{ id: string; balanceMinor: number; currency: Currency; accountNumber: string }>;
  credit(params: {
    userId: string;
    amountMinor: number;
    currency: Currency;
    type: Extract<WalletTransactionType, "DEPOSIT" | "REFUND" | "ADJUSTMENT" | "TRANSFER">;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<void>;
  debit(params: {
    userId: string;
    amountMinor: number;
    currency: Currency;
    description: string;
    referenceType?: string;
    referenceId?: string;
    type?: Extract<WalletTransactionType, "PAYMENT" | "ADJUSTMENT" | "TRANSFER">;
  }): Promise<{ success: boolean; reason?: string }>;
}

class LedgerWalletService implements WalletService {
  async getOrCreateWallet(userId: string, currency: Currency) {
    const existing = await db.wallet.findUnique({ where: { userId } });
    if (existing) return existing;
    const accountNumber = await generateUniqueAccountNumber();
    return db.wallet.create({ data: { userId, currency, balanceMinor: 0, accountNumber } });
  }

  async credit({
    userId,
    amountMinor,
    currency,
    type,
    description,
    referenceType,
    referenceId,
  }: {
    userId: string;
    amountMinor: number;
    currency: Currency;
    type: Extract<WalletTransactionType, "DEPOSIT" | "REFUND" | "ADJUSTMENT" | "TRANSFER">;
    description: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<void> {
    await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      const amountInWalletCurrency =
        currency === wallet.currency ? amountMinor : currencyConversionService.convert(amountMinor, currency, wallet.currency);
      const balanceAfter = wallet.balanceMinor + amountInWalletCurrency;
      await tx.wallet.update({ where: { userId }, data: { balanceMinor: balanceAfter } });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amountMinor: amountInWalletCurrency,
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
    currency,
    description,
    referenceType,
    referenceId,
    type = "PAYMENT",
  }: {
    userId: string;
    amountMinor: number;
    currency: Currency;
    description: string;
    referenceType?: string;
    referenceId?: string;
    type?: Extract<WalletTransactionType, "PAYMENT" | "ADJUSTMENT" | "TRANSFER">;
  }): Promise<{ success: boolean; reason?: string }> {
    return db.$transaction(async (tx: Prisma.TransactionClient) => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      const amountInWalletCurrency =
        currency === wallet.currency ? amountMinor : currencyConversionService.convert(amountMinor, currency, wallet.currency);
      if (wallet.balanceMinor < amountInWalletCurrency) {
        return { success: false, reason: "INSUFFICIENT_FUNDS" };
      }
      const balanceAfter = wallet.balanceMinor - amountInWalletCurrency;
      await tx.wallet.update({ where: { userId }, data: { balanceMinor: balanceAfter } });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amountMinor: -amountInWalletCurrency,
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
