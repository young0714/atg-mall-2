-- Rename Quotation.chinaShippingMinor to domesticShippingMinor.
-- The Shop-for-Me / Source-a-Product quoting flow named this column after
-- China specifically, before Shop from USA/UK existed as origins. Same
-- rename Order.domesticShippingMinor already used; no data/type change.
ALTER TABLE "Quotation" RENAME COLUMN "chinaShippingMinor" TO "domesticShippingMinor";
