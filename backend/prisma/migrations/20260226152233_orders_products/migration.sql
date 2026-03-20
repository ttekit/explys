/*
  Warnings:

  - A unique constraint covering the columns `[package_id]` on the table `order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `package_id` to the `order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "order" ADD COLUMN     "package_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "order_package_id_key" ON "order"("package_id");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "products_packegs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
