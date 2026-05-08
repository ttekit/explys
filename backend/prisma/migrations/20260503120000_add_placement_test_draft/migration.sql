-- Persist server-side placement draft for scoring POST /placement-test/complete
ALTER TABLE "users" ADD COLUMN "placement_test_draft" JSONB;
