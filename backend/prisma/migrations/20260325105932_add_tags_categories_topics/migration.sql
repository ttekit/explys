/*
  Warnings:

  - You are about to drop the column `role_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `surname` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `Jurisdiction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_JurisdictionToProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `billing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_on_jurisdiction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_on_package` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `products_packegs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tax_rates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_JurisdictionToProduct" DROP CONSTRAINT "_JurisdictionToProduct_A_fkey";

-- DropForeignKey
ALTER TABLE "_JurisdictionToProduct" DROP CONSTRAINT "_JurisdictionToProduct_B_fkey";

-- DropForeignKey
ALTER TABLE "billing" DROP CONSTRAINT "billing_user_id_fkey";

-- DropForeignKey
ALTER TABLE "order" DROP CONSTRAINT "order_package_id_fkey";

-- DropForeignKey
ALTER TABLE "order" DROP CONSTRAINT "order_user_id_fkey";

-- DropForeignKey
ALTER TABLE "order_on_jurisdiction" DROP CONSTRAINT "order_on_jurisdiction_jurisdiction_id_fkey";

-- DropForeignKey
ALTER TABLE "order_on_jurisdiction" DROP CONSTRAINT "order_on_jurisdiction_order_id_fkey";

-- DropForeignKey
ALTER TABLE "product_on_package" DROP CONSTRAINT "product_on_package_package_id_fkey";

-- DropForeignKey
ALTER TABLE "product_on_package" DROP CONSTRAINT "product_on_package_product_id_fkey";

-- DropForeignKey
ALTER TABLE "tax_rates" DROP CONSTRAINT "tax_rates_jurisdiction_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_role_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role_id",
DROP COLUMN "surname",
ADD COLUMN     "education" TEXT,
ADD COLUMN     "englishLevel" TEXT,
ADD COLUMN     "hobbies" TEXT[],
ADD COLUMN     "workField" TEXT;

-- DropTable
DROP TABLE "Jurisdiction";

-- DropTable
DROP TABLE "_JurisdictionToProduct";

-- DropTable
DROP TABLE "billing";

-- DropTable
DROP TABLE "order";

-- DropTable
DROP TABLE "order_on_jurisdiction";

-- DropTable
DROP TABLE "product_on_package";

-- DropTable
DROP TABLE "products";

-- DropTable
DROP TABLE "products_packegs";

-- DropTable
DROP TABLE "roles";

-- DropTable
DROP TABLE "tax_rates";

-- DropEnum
DROP TYPE "PaymentMethodType";

-- DropEnum
DROP TYPE "Status";

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
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "_FavoriteGenres_B_index" ON "_FavoriteGenres"("B");

-- CreateIndex
CREATE INDEX "_HatedGenres_B_index" ON "_HatedGenres"("B");

-- CreateIndex
CREATE INDEX "_TagToTopic_B_index" ON "_TagToTopic"("B");

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FavoriteGenres" ADD CONSTRAINT "_FavoriteGenres_A_fkey" FOREIGN KEY ("A") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FavoriteGenres" ADD CONSTRAINT "_FavoriteGenres_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HatedGenres" ADD CONSTRAINT "_HatedGenres_A_fkey" FOREIGN KEY ("A") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HatedGenres" ADD CONSTRAINT "_HatedGenres_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTopic" ADD CONSTRAINT "_TagToTopic_A_fkey" FOREIGN KEY ("A") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTopic" ADD CONSTRAINT "_TagToTopic_B_fkey" FOREIGN KEY ("B") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
