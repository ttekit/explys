-- Watch sessions (JWT watch-complete), comprehension attempts, placement attempts for admin KPIs.

CREATE TABLE "watch_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content_video_id" INTEGER NOT NULL,
    "completion_date" DATE NOT NULL,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seconds_watched" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "watch_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comprehension_test_attempts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content_video_id" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "score_pct" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comprehension_test_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "placement_attempts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "score_correct" INTEGER NOT NULL,
    "score_total" INTEGER NOT NULL,
    "score_pct" DOUBLE PRECISION NOT NULL,
    "english_level" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "placement_attempts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "watch_sessions"
    ADD CONSTRAINT "watch_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "watch_sessions"
    ADD CONSTRAINT "watch_sessions_content_video_id_fkey"
    FOREIGN KEY ("content_video_id") REFERENCES "content_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comprehension_test_attempts"
    ADD CONSTRAINT "comprehension_test_attempts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "comprehension_test_attempts"
    ADD CONSTRAINT "comprehension_test_attempts_content_video_id_fkey"
    FOREIGN KEY ("content_video_id") REFERENCES "content_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "placement_attempts"
    ADD CONSTRAINT "placement_attempts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "watch_sessions_user_id_content_video_id_completion_date_key"
    ON "watch_sessions"("user_id", "content_video_id", "completion_date");

CREATE INDEX "watch_sessions_user_id_content_video_id_ended_at_idx"
    ON "watch_sessions"("user_id", "content_video_id", "ended_at");

CREATE INDEX "watch_sessions_ended_at_idx" ON "watch_sessions"("ended_at");

CREATE INDEX "comprehension_test_attempts_user_id_content_video_id_created_at_idx"
    ON "comprehension_test_attempts"("user_id", "content_video_id", "created_at");

CREATE INDEX "comprehension_test_attempts_created_at_idx"
    ON "comprehension_test_attempts"("created_at");

CREATE INDEX "placement_attempts_user_id_created_at_idx"
    ON "placement_attempts"("user_id", "created_at");

CREATE INDEX "placement_attempts_created_at_idx" ON "placement_attempts"("created_at");
