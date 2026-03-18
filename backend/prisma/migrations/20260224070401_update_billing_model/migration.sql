/*
  Warnings:

  - You are about to drop the column `card` on the `billing` table. All the data in the column will be lost.
  - You are about to drop the column `cvv` on the `billing` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `billing` table. All the data in the column will be lost.
  - Added the required column `details` to the `billing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_method` to the `billing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `billing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "billing" DROP COLUMN "card",
DROP COLUMN "cvv",
DROP COLUMN "date",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "details" JSONB NOT NULL,
ADD COLUMN     "payment_method" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
