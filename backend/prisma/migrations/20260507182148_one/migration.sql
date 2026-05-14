-- CreateTable
CREATE TABLE "contents" (
    "id" SERIAL NOT NULL,
    "friendly_link" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_medias" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_medias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_stats" (
    "id" SERIAL NOT NULL,
    "content_media_id" INTEGER NOT NULL,
    "users_watched" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "system_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "user_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "processing_complexity" INTEGER,

    CONSTRAINT "content_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_videos" (
    "id" SERIAL NOT NULL,
    "content_id" INTEGER NOT NULL,
    "video_link" TEXT NOT NULL,
    "video_name" TEXT NOT NULL,
    "video_description" TEXT,
    "comprehension_tests_cache" JSONB,

    CONSTRAINT "content_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "video_captions" (
    "id" SERIAL NOT NULL,
    "content_video_id" INTEGER NOT NULL,
    "subtitles_file_link" TEXT NOT NULL,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_captions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'adult',
    "has_completed_placement" BOOLEAN NOT NULL DEFAULT false,
    "placement_test_draft" JSONB,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "teacher_id" INTEGER,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "additional_user_data" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "nativeLanguage" TEXT,
    "knownLanguages" TEXT[],
    "knownLanguageLevels" JSONB,
    "job" TEXT,
    "education" TEXT,
    "englishLevel" TEXT,
    "workField" TEXT,
    "hobbies" TEXT[],
    "interests" TEXT[],
    "teacherGrades" TEXT,
    "teacherTopics" TEXT[],
    "studentNames" JSONB,
    "studentGrade" TEXT,
    "studentProblemTopics" TEXT[],

    CONSTRAINT "additional_user_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "complexity" DOUBLE PRECISION NOT NULL,
    "language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "currentResolution" TEXT,
    "playbackSpeed" DOUBLE PRECISION,
    "studyingLanguage" TEXT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistics" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "studyingProgress" DOUBLE PRECISION,
    "lastLesson" TIMESTAMP(3),
    "isCurrentlyLearning" BOOLEAN NOT NULL DEFAULT false,
    "learnedAmount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_language_data" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "listening_score" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "vocabulary_score" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "grammar_score" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "algorithmVersion" TEXT NOT NULL DEFAULT 'v2',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_language_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_friends" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "friendId" INTEGER NOT NULL,
    "friendshipCreatedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_friends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_vocabulary" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "language_code" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'topic_tags',
    "topic_id" INTEGER,
    "mastery" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_vocabulary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "_ContentStatsToTopic" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ContentStatsToTopic_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SelectedTopics" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_SelectedTopics_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FavoriteGenres" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FavoriteGenres_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_HatedGenres" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_HatedGenres_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TagToTopic" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_TagToTopic_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_stats_content_media_id_key" ON "content_stats"("content_media_id");

-- CreateIndex
CREATE INDEX "watch_sessions_user_id_content_video_id_ended_at_idx" ON "watch_sessions"("user_id", "content_video_id", "ended_at");

-- CreateIndex
CREATE INDEX "watch_sessions_ended_at_idx" ON "watch_sessions"("ended_at");

-- CreateIndex
CREATE UNIQUE INDEX "watch_sessions_user_id_content_video_id_completion_date_key" ON "watch_sessions"("user_id", "content_video_id", "completion_date");

-- CreateIndex
CREATE INDEX "comprehension_test_attempts_user_id_content_video_id_create_idx" ON "comprehension_test_attempts"("user_id", "content_video_id", "created_at");

-- CreateIndex
CREATE INDEX "comprehension_test_attempts_created_at_idx" ON "comprehension_test_attempts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "video_captions_content_video_id_key" ON "video_captions"("content_video_id");

-- CreateIndex
CREATE INDEX "post_watch_surveys_content_video_id_user_id_idx" ON "post_watch_surveys"("content_video_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_teacher_id_idx" ON "users"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "additional_user_data_userId_key" ON "additional_user_data"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "settings_userId_key" ON "settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "statistics_userId_key" ON "statistics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_language_data_userId_topicId_key" ON "user_language_data"("userId", "topicId");

-- CreateIndex
CREATE INDEX "user_vocabulary_user_id_language_code_idx" ON "user_vocabulary"("user_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "user_vocabulary_user_id_language_code_term_key" ON "user_vocabulary"("user_id", "language_code", "term");

-- CreateIndex
CREATE INDEX "placement_attempts_user_id_created_at_idx" ON "placement_attempts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "placement_attempts_created_at_idx" ON "placement_attempts"("created_at");

-- CreateIndex
CREATE INDEX "_ContentStatsToTopic_B_index" ON "_ContentStatsToTopic"("B");

-- CreateIndex
CREATE INDEX "_SelectedTopics_B_index" ON "_SelectedTopics"("B");

-- CreateIndex
CREATE INDEX "_FavoriteGenres_B_index" ON "_FavoriteGenres"("B");

-- CreateIndex
CREATE INDEX "_HatedGenres_B_index" ON "_HatedGenres"("B");

-- CreateIndex
CREATE INDEX "_TagToTopic_B_index" ON "_TagToTopic"("B");

-- AddForeignKey
ALTER TABLE "content_medias" ADD CONSTRAINT "content_medias_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_stats" ADD CONSTRAINT "content_stats_content_media_id_fkey" FOREIGN KEY ("content_media_id") REFERENCES "content_medias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_videos" ADD CONSTRAINT "content_videos_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_medias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_sessions" ADD CONSTRAINT "watch_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_sessions" ADD CONSTRAINT "watch_sessions_content_video_id_fkey" FOREIGN KEY ("content_video_id") REFERENCES "content_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprehension_test_attempts" ADD CONSTRAINT "comprehension_test_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comprehension_test_attempts" ADD CONSTRAINT "comprehension_test_attempts_content_video_id_fkey" FOREIGN KEY ("content_video_id") REFERENCES "content_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_captions" ADD CONSTRAINT "video_captions_content_video_id_fkey" FOREIGN KEY ("content_video_id") REFERENCES "content_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_watch_surveys" ADD CONSTRAINT "post_watch_surveys_content_video_id_fkey" FOREIGN KEY ("content_video_id") REFERENCES "content_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_watch_surveys" ADD CONSTRAINT "post_watch_surveys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "additional_user_data" ADD CONSTRAINT "additional_user_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistics" ADD CONSTRAINT "statistics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_language_data" ADD CONSTRAINT "user_language_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_language_data" ADD CONSTRAINT "user_language_data_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_friends" ADD CONSTRAINT "user_friends_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_friends" ADD CONSTRAINT "user_friends_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vocabulary" ADD CONSTRAINT "user_vocabulary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_vocabulary" ADD CONSTRAINT "user_vocabulary_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_attempts" ADD CONSTRAINT "placement_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContentStatsToTopic" ADD CONSTRAINT "_ContentStatsToTopic_A_fkey" FOREIGN KEY ("A") REFERENCES "content_stats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContentStatsToTopic" ADD CONSTRAINT "_ContentStatsToTopic_B_fkey" FOREIGN KEY ("B") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SelectedTopics" ADD CONSTRAINT "_SelectedTopics_A_fkey" FOREIGN KEY ("A") REFERENCES "additional_user_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SelectedTopics" ADD CONSTRAINT "_SelectedTopics_B_fkey" FOREIGN KEY ("B") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FavoriteGenres" ADD CONSTRAINT "_FavoriteGenres_A_fkey" FOREIGN KEY ("A") REFERENCES "additional_user_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FavoriteGenres" ADD CONSTRAINT "_FavoriteGenres_B_fkey" FOREIGN KEY ("B") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HatedGenres" ADD CONSTRAINT "_HatedGenres_A_fkey" FOREIGN KEY ("A") REFERENCES "additional_user_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HatedGenres" ADD CONSTRAINT "_HatedGenres_B_fkey" FOREIGN KEY ("B") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTopic" ADD CONSTRAINT "_TagToTopic_A_fkey" FOREIGN KEY ("A") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTopic" ADD CONSTRAINT "_TagToTopic_B_fkey" FOREIGN KEY ("B") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
