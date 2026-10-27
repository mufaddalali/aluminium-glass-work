import { Prisma, type MovementDirection, type MovementType } from "@prisma/client";
import type { MovementDto, ProductDto } from "@/lib/types";
import type { InventoryUnit } from "@/lib/glass";
import { d, moneyString, qty, qtyString } from "@/lib/money";
import { prisma } from "@/server/db/prisma";
import { ApiError } from "@/server/errors/api-error";
import { pageMeta } from "@/server/utils/paging";

const IN_TYPES = new Set<MovementType>(["INITIAL", "RECEIPT", "MANUAL_ADD", "CORRECTION", "CUSTOMER_RETURN"]);
const OUT_TYPES = new Set<MovementType>(["MANUAL_REMOVE", "CORRECTION"]);

const SORTS: Record<string, string> = {
  name: `p."name"`,
  stock: `p."stockQuantity"`,
  price: `p."defaultSellingPrice"`,
  updated: `p."updatedAt"`,
};

export type ProductWriteInput = {
  name: string;
  description?: string | null;
  quantity: string;
  defaultSellingPrice: string;
};

export async function lockProduct(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; name: string; stockQuantity: string }>>`
    SELECT "id", "name", "stockQuantity"::text AS "stockQuantity"
    FROM "Product"
    WHERE "id" = ${id}
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  return { ...row, stockQuantity: d(row.stockQuantity) };
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
    unit?: InventoryUnit;
  },
) {
  const product = await lockProduct(tx, input.productId);
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
    });
  }
  const afterQty = qty(after);
  await tx.product.update({
    where: { id: product.id },
    data: { stockQuantity: afterQty.toFixed(3) },
  });
  const movement = await tx.stockMovement.create({
    data: {
      productId: product.id,
      movementType: input.movementType,
      direction: input.direction,
      quantity: quantity.toFixed(3),
      unit: input.unit ?? "PIECE",
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

function productConditions(filters: { search?: string; stock?: string }) {
  const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (filters.search) {
    const like = `%${filters.search}%`;
    conditions.push(Prisma.sql`(p."name" ILIKE ${like} OR COALESCE(p."description", '') ILIKE ${like})`);
  }
  if (filters.stock === "out") conditions.push(Prisma.sql`p."stockQuantity" <= 0`);
  return Prisma.join(conditions, " AND ");
}

export async function listProducts(query: {
  page: number;
  pageSize: number;
  search?: string;
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
    ? await prisma.product.findMany({ where: { id: { in: ids } } })
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
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  return toProductDto(product);
}

export async function createProduct(input: ProductWriteInput, userId: string) {
  const quantity = nonNegativeQuantity(input.quantity);
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data: productData(input) });
    if (quantity.gt(0)) {
      await applyStockChange(tx, {
        productId: product.id,
        direction: "IN",
        quantity: quantity.toFixed(3),
        movementType: "INITIAL",
        reason: "Opening quantity",
        createdById: userId,
      });
    }
    const fresh = await tx.product.findUniqueOrThrow({ where: { id: product.id } });
    return toProductDto(fresh);
  });
}

export async function updateProduct(id: string, input: ProductWriteInput, userId: string) {
  const quantity = nonNegativeQuantity(input.quantity);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Product not found.");
    await tx.product.update({ where: { id }, data: productData(input) });
    const delta = quantity.minus(existing.stockQuantity.toString());
    if (!delta.isZero()) {
      await applyStockChange(tx, {
        productId: id,
        direction: delta.gt(0) ? "IN" : "OUT",
        quantity: delta.abs().toFixed(3),
        movementType: "CORRECTION",
        reason: "Quantity updated",
        createdById: userId,
      });
    }
    const fresh = await tx.product.findUniqueOrThrow({ where: { id } });
    return toProductDto(fresh);
  });
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
    const product = await tx.product.findUniqueOrThrow({ where: { id: input.productId } });
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
    const product = await tx.product.findUniqueOrThrow({ where: { id: input.productId } });
    return toProductDto(product);
  });
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

function nonNegativeQuantity(value: string) {
  const quantity = qty(value);
  if (quantity.isNegative()) throw new ApiError(400, "INVALID_QUANTITY", "Quantity cannot be negative.");
  return quantity;
}

function productData(input: ProductWriteInput) {
  const price = d(input.defaultSellingPrice);
  if (price.isNegative()) throw new ApiError(400, "INVALID_AMOUNT", "The selling price cannot be negative.");
  return {
    name: input.name.trim(),
    description: emptyToNull(input.description),
    defaultSellingPrice: moneyString(price),
  };
}

function toProductDto(product: {
  id: string;
  name: string;
  description: string | null;
  stockQuantity: { toString(): string };
  defaultSellingPrice: { toString(): string };
  updatedAt: Date;
}): ProductDto {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    stockQuantity: qtyString(product.stockQuantity.toString()),
    defaultSellingPrice: moneyString(product.defaultSellingPrice.toString()),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function countOutOfStock() {
  return prisma.product.count({ where: { stockQuantity: { lte: 0 } } });
}
