-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "saleSavingsMinor" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "listUnitPriceMinor" INTEGER;

-- CreateTable
CREATE TABLE "SiteSale" (
    "id" TEXT NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "headline" TEXT,
    "showCountdown" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSale_pkey" PRIMARY KEY ("id")
);
