/*
  Warnings:

  - Changed the type of `payment_method` on the `billing` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER');

-- AlterTable
ALTER TABLE "billing" DROP COLUMN "payment_method",
ADD COLUMN     "payment_method" "PaymentMethodType" NOT NULL;
