import { Prisma, type MovementDirection, type MovementType } from "@prisma/client";
import type { MovementDto, ProductDto } from "@/lib/types";
import type { InventoryUnit } from "@/lib/glass";
import { d, moneyString, qty, qtyString } from "@/lib/money";
import { stockStatus } from "@/lib/stock";
import { prisma } from "@/server/db/prisma";
import { ApiError } from "@/server/errors/api-error";
import { pageMeta } from "@/server/utils/paging";

const IN_TYPES = new Set<MovementType>(["INITIAL", "RECEIPT", "MANUAL_ADD", "CORRECTION", "CUSTOMER_RETURN"]);
const OUT_TYPES = new Set<MovementType>(["MANUAL_REMOVE", "CORRECTION"]);

const SORTS: Record<string, string> = {
  name: `p."name"`,
  sku: `p."sku"`,
  stock: `p."stockQuantity"`,
  price: `p."defaultSellingPrice"`,
  updated: `p."updatedAt"`,
};

export type ProductWriteInput = {
  sku?: string | null;
  name: string;
  categoryId: string;
  description?: string | null;
  brand?: string | null;
  colour?: string | null;
  thickness?: string | null;
  inventoryUnit: InventoryUnit;
  minimumStockLevel: string;
  defaultCostPrice?: string | null;
  defaultSellingPrice: string;
  openingQuantity?: string | null;
};

export async function lockProduct(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      name: string;
      isActive: boolean;
      inventoryUnit: InventoryUnit;
      stockQuantity: string;
      minimumStockLevel: string;
    }>
  >`
    SELECT "id", "name", "isActive", "inventoryUnit"::text AS "inventoryUnit",
           "stockQuantity"::text AS "stockQuantity", "minimumStockLevel"::text AS "minimumStockLevel"
    FROM "Product"
    WHERE "id" = ${id}
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  return {
    ...row,
    stockQuantity: d(row.stockQuantity),
    minimumStockLevel: d(row.minimumStockLevel),
  };
}

export async function applyStockChange(
  tx: Prisma.TransactionClient,
  input: {
    productId: string;
    direction: MovementDirection;
    quantity: Prisma.Decimal | string;
    movementType: MovementType;
    reason: string;
    createdById: string;
    occurredAt?: Date;
    referenceType?: string | null;
    referenceId?: string | null;
    supplierName?: string | null;
    supplierReference?: string | null;
    costPrice?: string | null;
    expectedUnit?: InventoryUnit;
    allowInactive?: boolean;
  },
) {
  const product = await lockProduct(tx, input.productId);
  if (!input.allowInactive && !product.isActive) {
    throw new ApiError(409, "PRODUCT_ARCHIVED", `${product.name} is archived.`);
  }
  if (input.expectedUnit && input.expectedUnit !== product.inventoryUnit) {
    throw new ApiError(400, "UNIT_MISMATCH", `${product.name} uses a different inventory unit.`);
  }
  const quantity = qty(input.quantity.toString());
  if (quantity.lte(0)) throw new ApiError(400, "INVALID_QUANTITY", "Quantity must be greater than zero.");
  const before = product.stockQuantity;
  const after = input.direction === "IN" ? before.plus(quantity) : before.minus(quantity);
  if (after.isNegative()) {
    throw new ApiError(409, "INSUFFICIENT_STOCK", `${product.name} does not have enough stock.`, {
      productId: product.id,
      productName: product.name,
      available: qtyString(before),
      required: qtyString(quantity),
      shortfall: qtyString(quantity.minus(before)),
      unit: product.inventoryUnit,
    });
  }
  const afterQty = qty(after);
  await tx.product.update({
    where: { id: product.id },
    data: {
      stockQuantity: afterQty.toFixed(3),
      ...(input.costPrice ? { defaultCostPrice: moneyString(input.costPrice) } : {}),
    },
  });
  const movement = await tx.stockMovement.create({
    data: {
      productId: product.id,
      movementType: input.movementType,
      direction: input.direction,
      quantity: quantity.toFixed(3),
      unit: product.inventoryUnit,
      stockBefore: qtyString(before),
      stockAfter: afterQty.toFixed(3),
      reason: input.reason.trim(),
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      supplierName: emptyToNull(input.supplierName),
      supplierReference: emptyToNull(input.supplierReference),
      costPrice: input.costPrice ? moneyString(input.costPrice) : null,
      occurredAt: input.occurredAt ?? new Date(),
      createdById: input.createdById,
    },
  });
  return { movement, before, after: afterQty, product };
}

function productConditions(filters: { search?: string; categoryId?: string; active?: boolean; stock?: string }) {
  const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (filters.search) {
    const like = `%${filters.search}%`;
    conditions.push(Prisma.sql`(p."name" ILIKE ${like} OR COALESCE(p."sku", '') ILIKE ${like} OR COALESCE(p."brand", '') ILIKE ${like})`);
  }
  if (filters.categoryId) conditions.push(Prisma.sql`p."categoryId" = ${filters.categoryId}`);
  if (filters.active === true) conditions.push(Prisma.sql`p."isActive" = true`);
  if (filters.active === false) conditions.push(Prisma.sql`p."isActive" = false`);
  if (filters.stock === "out") conditions.push(Prisma.sql`p."stockQuantity" <= 0`);
  if (filters.stock === "low") conditions.push(Prisma.sql`p."stockQuantity" > 0 AND p."stockQuantity" <= p."minimumStockLevel"`);
  if (filters.stock === "alert") conditions.push(Prisma.sql`p."stockQuantity" <= p."minimumStockLevel"`);
  return Prisma.join(conditions, " AND ");
}

export async function listProducts(query: {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string;
  active?: boolean;
  stock?: string;
  sort?: string;
  dir?: "asc" | "desc";
}) {
  const where = productConditions(query);
  const sortColumn = SORTS[query.sort ?? "name"] ?? SORTS.name;
  const direction = query.dir === "desc" ? "DESC" : "ASC";
  const order = Prisma.raw(`${sortColumn} ${direction}, p."id" ASC`);
  const countRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count FROM "Product" p WHERE ${where}
  `;
  const total = countRows[0]?.count ?? 0;
  const idRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT p."id" FROM "Product" p
    WHERE ${where}
    ORDER BY ${order}
    LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
  `;
  const ids = idRows.map((row) => row.id);
  const products = ids.length
    ? await prisma.product.findMany({ where: { id: { in: ids } }, include: { category: true } })
    : [];
  const byId = new Map(products.map((product) => [product.id, product]));
  return {
    items: ids.flatMap((id) => {
      const product = byId.get(id);
      return product ? [toProductDto(product)] : [];
    }),
    meta: pageMeta(total, query.page, query.pageSize),
  };
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: { category: true } });
  if (!product) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  return toProductDto(product);
}

export async function createProduct(input: ProductWriteInput, userId: string) {
  const category = await prisma.productCategory.findUnique({ where: { id: input.categoryId } });
  if (!category || !category.isActive) throw new ApiError(400, "CATEGORY_REQUIRED", "Choose an active category.");
  const opening = input.openingQuantity ? qty(input.openingQuantity) : qty(0);
  if (opening.isNegative()) throw new ApiError(400, "INVALID_QUANTITY", "Opening stock cannot be negative.");
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: productData(input),
      include: { category: true },
    });
    if (opening.gt(0)) {
      await applyStockChange(tx, {
        productId: product.id,
        direction: "IN",
        quantity: opening.toFixed(3),
        movementType: "INITIAL",
        reason: "Opening stock",
        createdById: userId,
      });
    }
    const fresh = await tx.product.findUniqueOrThrow({ where: { id: product.id }, include: { category: true } });
    return toProductDto(fresh);
  });
}

export async function updateProduct(id: string, input: ProductWriteInput) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  if (input.inventoryUnit !== existing.inventoryUnit) {
    const [movements, lines] = await Promise.all([
      prisma.stockMovement.count({ where: { productId: id } }),
      prisma.invoiceLine.count({ where: { productId: id } }),
    ]);
    if (movements + lines > 0) {
      throw new ApiError(409, "UNIT_LOCKED", "The inventory unit cannot change after stock or invoices exist.");
    }
  }
  const category = await prisma.productCategory.findUnique({ where: { id: input.categoryId } });
  if (!category || !category.isActive) throw new ApiError(400, "CATEGORY_REQUIRED", "Choose an active category.");
  const product = await prisma.product.update({
    where: { id },
    data: productData(input),
    include: { category: true },
  });
  return toProductDto(product);
}

export async function archiveProduct(id: string) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false },
    include: { category: true },
  });
  return toProductDto(product);
}

export async function receiveStock(
  input: {
    productId: string;
    quantity: string;
    occurredAt: Date;
    costPrice?: string | null;
    supplierName?: string | null;
    supplierReference?: string | null;
    reason: string;
    movementType: MovementType;
  },
  userId: string,
) {
  if (!IN_TYPES.has(input.movementType)) throw new ApiError(400, "INVALID_REASON", "Choose a valid reason for adding stock.");
  return prisma.$transaction(async (tx) => {
    await applyStockChange(tx, {
      productId: input.productId,
      direction: "IN",
      quantity: input.quantity,
      movementType: input.movementType,
      reason: input.reason,
      createdById: userId,
      occurredAt: input.occurredAt,
      supplierName: input.supplierName,
      supplierReference: input.supplierReference,
      costPrice: input.costPrice,
    });
    const product = await tx.product.findUniqueOrThrow({ where: { id: input.productId }, include: { category: true } });
    return toProductDto(product);
  });
}

export async function removeStock(
  input: { productId: string; quantity: string; occurredAt: Date; reason: string; movementType: MovementType },
  userId: string,
) {
  if (!OUT_TYPES.has(input.movementType)) throw new ApiError(400, "INVALID_REASON", "Choose a valid reason for removing stock.");
  return prisma.$transaction(async (tx) => {
    await applyStockChange(tx, {
      productId: input.productId,
      direction: "OUT",
      quantity: input.quantity,
      movementType: input.movementType,
      reason: input.reason,
      createdById: userId,
      occurredAt: input.occurredAt,
    });
    const product = await tx.product.findUniqueOrThrow({ where: { id: input.productId }, include: { category: true } });
    return toProductDto(product);
  });
}

export async function listCategories() {
  return prisma.productCategory.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new ApiError(400, "CATEGORY_REQUIRED", "Enter a category name.");
  return prisma.productCategory.create({ data: { name: trimmed } });
}

export async function listMovements(query: {
  page: number;
  pageSize: number;
  search?: string;
  productId?: string;
  direction?: MovementDirection;
  from?: Date;
  to?: Date;
}) {
  const where: Prisma.StockMovementWhereInput = {};
  if (query.productId) where.productId = query.productId;
  if (query.direction) where.direction = query.direction;
  if (query.from || query.to) where.occurredAt = { gte: query.from, lte: query.to };
  if (query.search) {
    where.OR = [
      { reason: { contains: query.search, mode: "insensitive" } },
      { product: { name: { contains: query.search, mode: "insensitive" } } },
      { supplierName: { contains: query.search, mode: "insensitive" } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      include: { product: true, createdBy: true },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  const invoiceIds = rows.flatMap((row) => (row.referenceType === "INVOICE" && row.referenceId ? [row.referenceId] : []));
  const invoices = invoiceIds.length
    ? await prisma.invoice.findMany({ where: { id: { in: invoiceIds } }, select: { id: true, invoiceNumber: true } })
    : [];
  const numbers = new Map(invoices.map((invoice) => [invoice.id, invoice.invoiceNumber]));
  const items: MovementDto[] = rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    productName: row.product.name,
    movementType: row.movementType,
    direction: row.direction,
    quantity: row.quantity.toString(),
    unit: row.unit,
    stockBefore: row.stockBefore?.toString() ?? null,
    stockAfter: row.stockAfter?.toString() ?? null,
    reason: row.reason,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    invoiceNumber: row.referenceId ? numbers.get(row.referenceId) ?? null : null,
    supplierName: row.supplierName,
    supplierReference: row.supplierReference,
    costPrice: row.costPrice?.toString() ?? null,
    occurredAt: row.occurredAt.toISOString(),
    createdByName: row.createdBy.name,
  }));
  return { items, meta: pageMeta(total, query.page, query.pageSize) };
}

function productData(input: ProductWriteInput) {
  const minimum = qty(input.minimumStockLevel);
  const price = d(input.defaultSellingPrice);
  const cost = input.defaultCostPrice ? d(input.defaultCostPrice) : null;
  if (minimum.isNegative() || price.isNegative() || (cost && cost.isNegative())) {
    throw new ApiError(400, "INVALID_AMOUNT", "Prices and minimum stock cannot be negative.");
  }
  return {
    sku: emptyToNull(input.sku),
    name: input.name.trim(),
    categoryId: input.categoryId,
    description: emptyToNull(input.description),
    brand: emptyToNull(input.brand),
    colour: emptyToNull(input.colour),
    thickness: emptyToNull(input.thickness),
    inventoryUnit: input.inventoryUnit,
    minimumStockLevel: minimum.toFixed(3),
    defaultCostPrice: cost ? moneyString(cost) : null,
    defaultSellingPrice: moneyString(price),
  };
}

function toProductDto(product: {
  id: string;
  sku: string | null;
  name: string;
  categoryId: string;
  description: string | null;
  brand: string | null;
  colour: string | null;
  thickness: string | null;
  inventoryUnit: InventoryUnit;
  stockQuantity: { toString(): string };
  minimumStockLevel: { toString(): string };
  defaultCostPrice: { toString(): string } | null;
  defaultSellingPrice: { toString(): string };
  isActive: boolean;
  updatedAt: Date;
  category: { name: string };
}): ProductDto {
  const stockQuantity = qtyString(product.stockQuantity.toString());
  const minimumStockLevel = qtyString(product.minimumStockLevel.toString());
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    description: product.description,
    brand: product.brand,
    colour: product.colour,
    thickness: product.thickness,
    inventoryUnit: product.inventoryUnit,
    stockQuantity,
    minimumStockLevel,
    defaultCostPrice: product.defaultCostPrice ? moneyString(product.defaultCostPrice.toString()) : null,
    defaultSellingPrice: moneyString(product.defaultSellingPrice.toString()),
    isActive: product.isActive,
    stockStatus: stockStatus(stockQuantity, minimumStockLevel),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function countStockAlerts() {
  const [lowRows, outOfStock] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM "Product"
      WHERE "isActive" = true AND "stockQuantity" > 0 AND "stockQuantity" <= "minimumStockLevel"
    `,
    prisma.product.count({ where: { isActive: true, stockQuantity: { lte: 0 } } }),
  ]);
  return { lowStockCount: lowRows[0]?.count ?? 0, outOfStockCount: outOfStock };
}
