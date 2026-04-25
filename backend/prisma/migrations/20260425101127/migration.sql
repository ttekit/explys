-- AlterTable
ALTER TABLE "additional_user_data" ADD COLUMN     "studentGrade" TEXT,
ADD COLUMN     "studentNames" JSONB,
ADD COLUMN     "studentProblemTopics" TEXT[],
ADD COLUMN     "teacherGrades" TEXT,
ADD COLUMN     "teacherTopics" TEXT[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'adult';
