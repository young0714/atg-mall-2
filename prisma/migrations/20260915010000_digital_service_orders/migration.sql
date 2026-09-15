-- Digital Services (Reloadly) — airtime top-ups. Pure addition: a new enum
-- and a new table, no existing columns touched.

CREATE TYPE "DigitalServiceType" AS ENUM ('AIRTIME');

CREATE TABLE "DigitalServiceOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DigitalServiceType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "providerName" TEXT NOT NULL DEFAULT 'RELOADLY',
    "providerRef" TEXT,
    "countryIso" TEXT NOT NULL,
    "operatorId" INTEGER NOT NULL,
    "operatorName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "deliveredAmountMinor" INTEGER,
    "deliveredCurrencyCode" TEXT,
    "providerCostMinor" INTEGER,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalServiceOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DigitalServiceOrder_userId_idx" ON "DigitalServiceOrder"("userId");

ALTER TABLE "DigitalServiceOrder" ADD CONSTRAINT "DigitalServiceOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
