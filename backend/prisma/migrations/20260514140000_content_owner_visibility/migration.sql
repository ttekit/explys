-- AlterTable
ALTER TABLE "contents" ADD COLUMN "owner_user_id" INTEGER,
ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'public';

-- CreateIndex
CREATE INDEX "contents_owner_user_id_idx" ON "contents"("owner_user_id");

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
