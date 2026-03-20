-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ARRIVED', 'DELIVERING', 'PENDING', 'BLOCKED');

-- CreateTable
CREATE TABLE "products_packegs" (
    "id" SERIAL NOT NULL,
    "package" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',
    "tax_rate" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "products_packegs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "product" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_on_package" (
    "product_id" INTEGER NOT NULL,
    "package_id" INTEGER NOT NULL,

    CONSTRAINT "product_on_package_pkey" PRIMARY KEY ("product_id","package_id")
);

-- CreateTable
CREATE TABLE "_JurisdictionToProduct" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_JurisdictionToProduct_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_JurisdictionToProduct_B_index" ON "_JurisdictionToProduct"("B");

-- AddForeignKey
ALTER TABLE "product_on_package" ADD CONSTRAINT "product_on_package_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_on_package" ADD CONSTRAINT "product_on_package_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "products_packegs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JurisdictionToProduct" ADD CONSTRAINT "_JurisdictionToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "Jurisdiction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JurisdictionToProduct" ADD CONSTRAINT "_JurisdictionToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
