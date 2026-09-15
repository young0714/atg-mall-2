-- Digital Services Phase 3 (Utility Payments). Pure addition: a new enum
-- value and two new nullable columns.

ALTER TYPE "DigitalServiceType" ADD VALUE 'UTILITY_BILL';

ALTER TABLE "DigitalServiceOrder" ADD COLUMN "subscriberAccountNumber" TEXT;
ALTER TABLE "DigitalServiceOrder" ADD COLUMN "validatedCustomerName" TEXT;
