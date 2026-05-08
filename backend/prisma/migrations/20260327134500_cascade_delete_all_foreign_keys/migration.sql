-- Apply ON DELETE CASCADE to all explicit foreign keys

ALTER TABLE "content_medias" DROP CONSTRAINT IF EXISTS "content_medias_category_id_fkey";
ALTER TABLE "content_medias"
ADD CONSTRAINT "content_medias_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "content_stats" DROP CONSTRAINT IF EXISTS "content_stats_content_media_id_fkey";
ALTER TABLE "content_stats"
ADD CONSTRAINT "content_stats_content_media_id_fkey"
FOREIGN KEY ("content_media_id") REFERENCES "content_medias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "content_videos" DROP CONSTRAINT IF EXISTS "content_videos_content_id_fkey";
ALTER TABLE "content_videos"
ADD CONSTRAINT "content_videos_content_id_fkey"
FOREIGN KEY ("content_id") REFERENCES "content_medias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "additional_user_data" DROP CONSTRAINT IF EXISTS "additional_user_data_userId_fkey";
ALTER TABLE "additional_user_data"
ADD CONSTRAINT "additional_user_data_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "topics" DROP CONSTRAINT IF EXISTS "topics_categoryId_fkey";
ALTER TABLE "topics"
ADD CONSTRAINT "topics_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "settings_userId_fkey";
ALTER TABLE "settings"
ADD CONSTRAINT "settings_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "statistics" DROP CONSTRAINT IF EXISTS "statistics_userId_fkey";
ALTER TABLE "statistics"
ADD CONSTRAINT "statistics_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_language_data" DROP CONSTRAINT IF EXISTS "user_language_data_userId_fkey";
ALTER TABLE "user_language_data"
ADD CONSTRAINT "user_language_data_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_language_data" DROP CONSTRAINT IF EXISTS "user_language_data_topicId_fkey";
ALTER TABLE "user_language_data"
ADD CONSTRAINT "user_language_data_topicId_fkey"
FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_friends" DROP CONSTRAINT IF EXISTS "user_friends_userId_fkey";
ALTER TABLE "user_friends"
ADD CONSTRAINT "user_friends_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_friends" DROP CONSTRAINT IF EXISTS "user_friends_friendId_fkey";
ALTER TABLE "user_friends"
ADD CONSTRAINT "user_friends_friendId_fkey"
FOREIGN KEY ("friendId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
