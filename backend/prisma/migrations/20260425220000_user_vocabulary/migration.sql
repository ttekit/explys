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

CREATE UNIQUE INDEX "user_vocabulary_user_id_language_code_term_key" ON "user_vocabulary"("user_id", "language_code", "term");
CREATE INDEX "user_vocabulary_user_id_language_code_idx" ON "user_vocabulary"("user_id", "language_code");

ALTER TABLE "user_vocabulary" ADD CONSTRAINT "user_vocabulary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_vocabulary" ADD CONSTRAINT "user_vocabulary_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
