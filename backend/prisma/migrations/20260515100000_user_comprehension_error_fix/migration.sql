-- AlterTable
ALTER TABLE "users" ADD COLUMN "comprehension_wrong_bank" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "error_fixing_test_pending" BOOLEAN NOT NULL DEFAULT false;
