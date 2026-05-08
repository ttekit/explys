-- AlterTable
ALTER TABLE "additional_user_data" ADD COLUMN     "englishLevel" TEXT,
ADD COLUMN     "hobbies" TEXT[],
ADD COLUMN     "workField" TEXT,
ALTER COLUMN "knownLanguages" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_language_data" ALTER COLUMN "updatedAt" DROP DEFAULT;
