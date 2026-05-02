CREATE TABLE "post_watch_surveys" (
    "id" SERIAL NOT NULL,
    "content_video_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "questions_json" JSONB NOT NULL,
    "answers_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "post_watch_surveys_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "post_watch_surveys_content_video_id_user_id_idx" ON "post_watch_surveys"("content_video_id", "user_id");

ALTER TABLE "post_watch_surveys" ADD CONSTRAINT "post_watch_surveys_content_video_id_fkey" FOREIGN KEY ("content_video_id") REFERENCES "content_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "post_watch_surveys" ADD CONSTRAINT "post_watch_surveys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
