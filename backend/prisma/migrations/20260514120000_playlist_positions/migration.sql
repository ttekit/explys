-- Playlist ordering: slots within a series and clips within a slot.

ALTER TABLE "content_medias" ADD COLUMN "playlist_position" INTEGER;

UPDATE "content_medias" AS cm
SET "playlist_position" = sub.rn
FROM (
  SELECT id, (ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY id ASC) - 1) AS rn
  FROM "content_medias"
) AS sub
WHERE cm.id = sub.id;

ALTER TABLE "content_medias" ALTER COLUMN "playlist_position" SET NOT NULL;
ALTER TABLE "content_medias" ALTER COLUMN "playlist_position" SET DEFAULT 0;

CREATE UNIQUE INDEX "content_medias_category_id_playlist_position_key" ON "content_medias"("category_id", "playlist_position");

ALTER TABLE "content_videos" ADD COLUMN "playlist_position" INTEGER;

UPDATE "content_videos" AS cv
SET "playlist_position" = sub.rn
FROM (
  SELECT id, (ROW_NUMBER() OVER (PARTITION BY content_id ORDER BY id ASC) - 1) AS rn
  FROM "content_videos"
) AS sub
WHERE cv.id = sub.id;

ALTER TABLE "content_videos" ALTER COLUMN "playlist_position" SET NOT NULL;
ALTER TABLE "content_videos" ALTER COLUMN "playlist_position" SET DEFAULT 0;

CREATE UNIQUE INDEX "content_videos_content_id_playlist_position_key" ON "content_videos"("content_id", "playlist_position");
