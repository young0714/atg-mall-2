-- Database-level backstop: a wallet balance must never be stored as
-- negative, regardless of what application code does. Purely additive —
-- only fails if a row is already negative (none should be, since
-- debitWithinTx's atomic conditional update already prevents this at the
-- application level as of the walletService.ts change this migration ships
-- alongside).
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_balanceMinor_non_negative" CHECK ("balanceMinor" >= 0);
