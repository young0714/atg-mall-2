CREATE TYPE "WalletTransferStatus" AS ENUM ('COMPLETED', 'REVERSED');

CREATE TABLE "WalletTransfer" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "note" TEXT,
    "status" "WalletTransferStatus" NOT NULL DEFAULT 'COMPLETED',
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WalletTransfer_senderId_idx" ON "WalletTransfer"("senderId");
CREATE INDEX "WalletTransfer_recipientId_idx" ON "WalletTransfer"("recipientId");

ALTER TABLE "WalletTransfer" ADD CONSTRAINT "WalletTransfer_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WalletTransfer" ADD CONSTRAINT "WalletTransfer_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WalletTransfer" ADD CONSTRAINT "WalletTransfer_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
