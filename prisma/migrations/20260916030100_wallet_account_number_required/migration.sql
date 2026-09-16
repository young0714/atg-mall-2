-- Backfilled for every existing Wallet row before this migration runs.
ALTER TABLE "Wallet" ALTER COLUMN "accountNumber" SET NOT NULL;
CREATE UNIQUE INDEX "Wallet_accountNumber_key" ON "Wallet"("accountNumber");

ALTER TYPE "WalletTransactionType" ADD VALUE 'TRANSFER';
ALTER TYPE "OtpPurpose" ADD VALUE 'WALLET_TRANSFER';
