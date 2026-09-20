CREATE TABLE "HeroSettings" (
    "id" TEXT NOT NULL,
    "slideDurationSeconds" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSettings_pkey" PRIMARY KEY ("id")
);
