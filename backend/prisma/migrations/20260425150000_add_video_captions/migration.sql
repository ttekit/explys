-- CreateTable
CREATE TABLE "video_captions" (
    "id" SERIAL NOT NULL,
    "content_video_id" INTEGER NOT NULL,
    "subtitles_file_link" TEXT NOT NULL,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_captions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_captions_content_video_id_key" ON "video_captions"("content_video_id");

-- AddForeignKey
ALTER TABLE "video_captions" ADD CONSTRAINT "video_captions_content_video_id_fkey" FOREIGN KEY ("content_video_id") REFERENCES "content_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
