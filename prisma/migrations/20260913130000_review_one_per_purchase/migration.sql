-- One review per customer per product — customers can now actually submit
-- reviews (previously only admin moderation existed, with no way for a
-- real review to ever be created). No existing rows to conflict with.
CREATE UNIQUE INDEX "Review_productId_userId_key" ON "Review"("productId", "userId");
