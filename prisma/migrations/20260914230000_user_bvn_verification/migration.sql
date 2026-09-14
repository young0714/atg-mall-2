-- BVN verification state (Nigeria only — see depositLimitService.ts).
-- Pure expansion, both nullable, no backfill needed.
ALTER TABLE "User" ADD COLUMN "bvnVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "bvnVerifiedName" TEXT;
