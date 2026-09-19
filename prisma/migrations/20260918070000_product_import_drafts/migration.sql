CREATE TABLE "ProductImportDraft" (
    "id" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "basePriceMinor" INTEGER NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "importVariants" BOOLEAN NOT NULL,
    "includeVideo" BOOLEAN NOT NULL,
    "removedImageUrls" TEXT[],
    "removedVariantExternalIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductImportDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductImportDraft_createdByUserId_source_idx" ON "ProductImportDraft"("createdByUserId", "source");

ALTER TABLE "ProductImportDraft" ADD CONSTRAINT "ProductImportDraft_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
