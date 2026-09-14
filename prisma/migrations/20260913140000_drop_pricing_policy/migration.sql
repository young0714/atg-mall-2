-- PricingPolicy backed the old per-product "Estimated Landed Cost" feature
-- removed earlier this session — nothing in the app has read or written it
-- since, and its admin settings UI (also removed) was the only writer.
DROP TABLE "PricingPolicy";
