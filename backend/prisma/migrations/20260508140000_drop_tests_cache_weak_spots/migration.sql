-- Drop comprehension test JSON cache on videos
ALTER TABLE "content_videos" DROP COLUMN IF EXISTS "comprehension_tests_cache";

-- Per-user weak spots for quiz personalization
CREATE TABLE "user_comprehension_weak_spots" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content_video_id" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "stem_hash" VARCHAR(64) NOT NULL,
    "stem_snippet" VARCHAR(500) NOT NULL,
    "miss_count" INTEGER NOT NULL DEFAULT 1,
    "last_missed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_comprehension_weak_spots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_comprehension_weak_spots_user_id_content_video_id_stem_hash_key" ON "user_comprehension_weak_spots"("user_id", "content_video_id", "stem_hash");

CREATE INDEX "user_comprehension_weak_spots_user_id_content_video_id_last_missed_at_idx" ON "user_comprehension_weak_spots"("user_id", "content_video_id", "last_missed_at");

ALTER TABLE "user_comprehension_weak_spots" ADD CONSTRAINT "user_comprehension_weak_spots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_comprehension_weak_spots" ADD CONSTRAINT "user_comprehension_weak_spots_content_video_id_fkey" FOREIGN KEY ("content_video_id") REFERENCES "content_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
