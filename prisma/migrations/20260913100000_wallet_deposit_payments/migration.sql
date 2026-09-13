-- Payment.orderId becomes optional, and Payment.userId is added, so a
-- wallet top-up (deposit) charge can have its own Payment row without an
-- associated Order — needed now that real gateway charges are
-- asynchronous (redirect + webhook) rather than instant, for both the
-- checkout and wallet-deposit flows.
ALTER TABLE "Payment" ALTER COLUMN "orderId" DROP NOT NULL;
ALTER TABLE "Payment" ADD COLUMN "userId" TEXT;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
