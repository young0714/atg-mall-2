-- Checkout OTP — email verification required before any purchase completes.
-- Pure addition: a new enum and a new table.

CREATE TYPE "OtpPurpose" AS ENUM ('CHECKOUT', 'QUOTATION_ACCEPT', 'DIGITAL_SERVICE_AIRTIME', 'DIGITAL_SERVICE_GIFT_CARD', 'DIGITAL_SERVICE_UTILITY_BILL');

CREATE TABLE "CheckoutOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CheckoutOtp_userId_idx" ON "CheckoutOtp"("userId");

ALTER TABLE "CheckoutOtp" ADD CONSTRAINT "CheckoutOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
