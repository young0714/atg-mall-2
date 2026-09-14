-- Bank-transfer sender name match (Nigeria/NGN only — see nameMatchService.ts).
-- Pure expansion, all nullable, no backfill needed.
ALTER TABLE "Payment" ADD COLUMN "payerBankName" TEXT;
ALTER TABLE "Payment" ADD COLUMN "payerAccountName" TEXT;
ALTER TABLE "Payment" ADD COLUMN "payerAccountNumberMasked" TEXT;
ALTER TABLE "Payment" ADD COLUMN "nameMatchScore" DOUBLE PRECISION;
