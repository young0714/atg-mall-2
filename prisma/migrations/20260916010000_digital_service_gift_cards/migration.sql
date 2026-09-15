-- Digital Services Phase 2 (Gift Cards). Pure addition: a new enum value,
-- two new nullable columns, and loosening recipientPhone to nullable since
-- gift cards deliver to an email instead — no existing rows change meaning.

ALTER TYPE "DigitalServiceType" ADD VALUE 'GIFT_CARD';

ALTER TABLE "DigitalServiceOrder" ALTER COLUMN "recipientPhone" DROP NOT NULL;
ALTER TABLE "DigitalServiceOrder" ADD COLUMN "recipientEmail" TEXT;
ALTER TABLE "DigitalServiceOrder" ADD COLUMN "deliveryPayload" JSONB;
