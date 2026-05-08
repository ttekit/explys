ALTER TABLE "user_language_data" ADD COLUMN "listening_score" DOUBLE PRECISION;
ALTER TABLE "user_language_data" ADD COLUMN "vocabulary_score" DOUBLE PRECISION;
ALTER TABLE "user_language_data" ADD COLUMN "grammar_score" DOUBLE PRECISION;

UPDATE "user_language_data"
SET
  "listening_score" = "score",
  "vocabulary_score" = "score",
  "grammar_score" = "score"
WHERE "listening_score" IS NULL;

ALTER TABLE "user_language_data" ALTER COLUMN "listening_score" SET NOT NULL;
ALTER TABLE "user_language_data" ALTER COLUMN "vocabulary_score" SET NOT NULL;
ALTER TABLE "user_language_data" ALTER COLUMN "grammar_score" SET NOT NULL;

ALTER TABLE "user_language_data" ALTER COLUMN "algorithmVersion" SET DEFAULT 'v2';
