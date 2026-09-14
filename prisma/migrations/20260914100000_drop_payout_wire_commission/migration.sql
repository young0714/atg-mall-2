-- Payout was never referenced anywhere in application code (no admin UI,
-- no producer, no consumer) — dead feature, removed.
DROP TABLE "Payout";
DROP TYPE "PayoutStatus";

-- Commission is now written by commissionService.createForOrder() whenever
-- an order is paid; orderItemRef must be unique so that call is safely
-- idempotent (upsert-on-conflict) across retries/webhook+callback races.
CREATE UNIQUE INDEX "Commission_orderItemRef_key" ON "Commission"("orderItemRef");
