-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropIndex
DROP INDEX "Product_sku_key";
DROP INDEX "Product_categoryId_idx";
DROP INDEX "Product_isActive_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "sku",
DROP COLUMN "categoryId",
DROP COLUMN "brand",
DROP COLUMN "colour",
DROP COLUMN "thickness",
DROP COLUMN "inventoryUnit",
DROP COLUMN "minimumStockLevel",
DROP COLUMN "defaultCostPrice",
DROP COLUMN "isActive";

-- DropTable
DROP TABLE "ProductCategory";
