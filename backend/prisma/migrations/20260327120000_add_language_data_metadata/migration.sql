-- Add deterministic metadata fields for language analysis
ALTER TABLE "user_language_data"
ADD COLUMN "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "coverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "algorithmVersion" TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Ensure one score per user/topic pair for deterministic upserts
CREATE UNIQUE INDEX "user_language_data_userId_topicId_key"
ON "user_language_data"("userId", "topicId");
