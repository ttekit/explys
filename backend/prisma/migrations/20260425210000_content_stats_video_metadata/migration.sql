-- Structured video metadata (replaces ContentStats <-> Tag M2M)
ALTER TABLE "content_stats" ADD COLUMN IF NOT EXISTS "system_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "content_stats" ADD COLUMN IF NOT EXISTS "user_tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "content_stats" ADD COLUMN IF NOT EXISTS "processing_complexity" INTEGER;

DROP TABLE IF EXISTS "_ContentStatsToTag";
