import { Prisma, type InvoiceLine, type PaymentKind, type PaymentMethod, type PrismaClient, type SourceType } from "@prisma/client";
import type { DimensionUnit, InventoryUnit } from "@/lib/glass";
import { computeBilledQuantity } from "@/lib/glass";
import { computeInvoiceTotals, computeLineTotal, netPaid, outstandingAmount, statusFromPayments } from "@/lib/invoice-math";
import { d, Decimal, money, moneyString, qty, qtyString } from "@/lib/money";
import { monthKey, startOfMonthOffset, zonedParts } from "@/lib/timezone";
import type { InvoiceDto, InvoiceListItem, PaymentDto } from "@/lib/types";
import { applyStockChange, lockProduct } from "@/server/services/inventory.service";
import { ensureSettings } from "@/server/services/settings.service";
import { prisma } from "@/server/db/prisma";
import { ApiError } from "@/server/errors/api-error";
import { pageMeta } from "@/server/utils/paging";

type Db = Prisma.TransactionClient | PrismaClient;
const OPEN_STATUSES = ["ISSUED", "PARTIALLY_PAID", "PAID"] as const;

export type LineInput = {
  productId?: string | null;
  itemName?: string | null;
  description?: string | null;
  sourceType: SourceType;
  quantity: string;
  unit?: InventoryUnit | null;
  width?: string | null;
  height?: string | null;
  dimensionUnit?: DimensionUnit | null;
  pieceCount?: number | null;
  unitPrice: string;
  discountAmount?: string | null;
  purchaseCost?: string | null;
  supplierName?: string | null;
  supplierReference?: string | null;
  purchaseNotes?: string | null;
};

export type InvoiceInput = {
  customerId: string;
  invoiceDate: Date;
  dueDate?: Date | null;
  discountAmount?: string | null;
  notes?: string | null;
  terms?: string | null;
  lines: LineInput[];
};

const invoiceInclude = {
  customer: true,
  lines: { orderBy: { sortOrder: "asc" as const } },
  payments: { include: { receivedBy: true }, orderBy: { paymentDate: "asc" as const } },
} satisfies Prisma.InvoiceInclude;

type InvoiceRecord = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

export async function listInvoices(query: {
  page: number;
  pageSize: number;
  search?: string;
  status?: InvoiceListItem["status"];
  customerId?: string;
  from?: Date;
  to?: Date;
}) {
  const where = invoiceWhere(query);
  const [total, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: { customer: true, payments: true },
      orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return { items: rows.map(toListItem), meta: pageMeta(total, query.page, query.pageSize) };
}

export async function getInvoice(id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
  if (!invoice) throw new ApiError(404, "NOT_FOUND", "Invoice not found.");
  return toInvoiceDto(invoice);
}

export async function createInvoice(input: InvoiceInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    await assertActiveCustomer(tx, input.customerId);
    const settings = await ensureSettings(tx);
    const lines = await normalizeLines(tx, input.lines);
    const totals = totalsFor(lines, input.discountAmount, settings.taxEnabled, settings.taxRate.toString());
    const invoice = await tx.invoice.create({
      data: {
        customerId: input.customerId,
        status: "DRAFT",
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate ?? null,
        ...totalData(totals),
        notes: emptyToNull(input.notes),
        terms: emptyToNull(input.terms),
        createdById: userId,
        lines: { create: lines.map(lineCreateData) },
      },
      include: invoiceInclude,
    });
    return toInvoiceDto(invoice);
  });
}

export async function updateInvoice(id: string, input: InvoiceInput) {
  return prisma.$transaction(async (tx) => {
    const locked = await lockInvoice(tx, id);
    if (locked.status !== "DRAFT") {
      throw new ApiError(409, "INVOICE_LOCKED", "Issued invoices are kept as a historical record and cannot be edited.");
    }
    await assertActiveCustomer(tx, input.customerId);
    const settings = await ensureSettings(tx);
    const lines = await normalizeLines(tx, input.lines);
    const totals = totalsFor(lines, input.discountAmount, settings.taxEnabled, settings.taxRate.toString());
    await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
    await tx.invoice.update({
      where: { id },
      data: {
        customerId: input.customerId,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate ?? null,
        ...totalData(totals),
        notes: emptyToNull(input.notes),
        terms: emptyToNull(input.terms),
        lines: { create: lines.map(lineCreateData) },
      },
    });
    return toInvoiceDto(await tx.invoice.findUniqueOrThrow({ where: { id }, include: invoiceInclude }));
  });
}

export async function deleteDraft(id: string) {
  return prisma.$transaction(async (tx) => {
    const locked = await lockInvoice(tx, id);
    if (locked.status !== "DRAFT") throw new ApiError(409, "INVOICE_LOCKED", "Only a draft can be deleted.");
    await tx.invoice.delete({ where: { id } });
  });
}

export async function issueInvoice(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const locked = await lockInvoice(tx, id);
    if (locked.status === "VOID") throw new ApiError(409, "INVOICE_VOID", "A void invoice cannot be issued.");
    if (locked.status !== "DRAFT") {
      return toInvoiceDto(await tx.invoice.findUniqueOrThrow({ where: { id }, include: invoiceInclude }));
    }
    const current = await tx.invoice.findUniqueOrThrow({ where: { id }, include: invoiceInclude });
    if (!current.customer.isActive) throw new ApiError(409, "CUSTOMER_ARCHIVED", "This customer is archived.");
    const settings = await ensureSettings(tx);
    const lines = await normalizeLines(tx, current.lines.map(storedLineToInput));
    const totals = totalsFor(lines, current.discountAmount.toString(), settings.taxEnabled, settings.taxRate.toString());
    await assertStockAvailable(tx, lines);
    const invoiceNumber = current.invoiceNumber ?? (await nextInvoiceNumber(tx, settings.invoicePrefix, settings.timeZone));
    for (const [index, line] of lines.entries()) {
      const existing = current.lines[index];
      if (!existing) continue;
      await tx.invoiceLine.update({ where: { id: existing.id }, data: lineCreateData(line) });
      if (line.sourceType !== "STOCK" || !line.productId) continue;
      await applyStockChange(tx, {
        productId: line.productId,
        direction: "OUT",
        quantity: line.quantity,
        movementType: "INVOICE_ISSUED",
        reason: `Invoice ${invoiceNumber}`,
        createdById: userId,
        referenceType: "INVOICE",
        referenceId: id,
        unit: line.unit,
      });
    }
    const status = statusFromPayments(totals.totalAmount, 0);
    await tx.invoice.update({
      where: { id },
      data: {
        ...totalData(totals),
        status,
        invoiceNumber,
        issuedAt: new Date(),
      },
    });
    return toInvoiceDto(await tx.invoice.findUniqueOrThrow({ where: { id }, include: invoiceInclude }));
  });
}

export async function voidInvoice(id: string, reason: string, userId: string) {
  const trimmed = reason.trim();
  if (!trimmed) throw new ApiError(400, "VOID_REASON_REQUIRED", "Enter a reason for voiding the invoice.");
  return prisma.$transaction(async (tx) => {
    const locked = await lockInvoice(tx, id);
    if (locked.status === "VOID") {
      return toInvoiceDto(await tx.invoice.findUniqueOrThrow({ where: { id }, include: invoiceInclude }));
    }
    if (locked.status === "DRAFT") throw new ApiError(409, "DRAFT_VOID", "Delete the draft instead of voiding it.");
    const current = await tx.invoice.findUniqueOrThrow({ where: { id }, include: invoiceInclude });
    const paid = netPaid(current.payments.map((payment) => ({ kind: payment.kind, amount: payment.amount.toString() })));
    if (paid.gt(0)) {
      throw new ApiError(409, "PAYMENTS_REMAIN", "Record a refund for the amount already received before voiding this invoice.", {
        amountPaid: moneyString(paid),
      });
    }
    const stockLines = current.lines
      .filter((line) => line.sourceType === "STOCK" && line.productId)
      .sort((a, b) => (a.productId ?? "").localeCompare(b.productId ?? "") || a.sortOrder - b.sortOrder);
    for (const line of stockLines) {
      if (!line.productId) continue;
      await applyStockChange(tx, {
        productId: line.productId,
        direction: "IN",
        quantity: line.quantity.toString(),
        movementType: "INVOICE_VOIDED",
        reason: `Voided ${current.invoiceNumber ?? "invoice"}: ${trimmed}`,
        createdById: userId,
        referenceType: "INVOICE",
        referenceId: id,
        unit: line.unit,
      });
    }
    await tx.invoice.update({
      where: { id },
      data: { status: "VOID", voidedAt: new Date(), voidReason: trimmed },
    });
    return toInvoiceDto(await tx.invoice.findUniqueOrThrow({ where: { id }, include: invoiceInclude }));
  });
}

export async function recordInvoicePayment(
  input: {
    invoiceId: string;
    kind: PaymentKind;
    amount: string;
    paymentMethod: PaymentMethod;
    paymentDate: Date;
    reference?: string | null;
    notes?: string | null;
    idempotencyKey?: string | null;
  },
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    if (input.idempotencyKey) {
      const existing = await tx.payment.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { invoice: { include: invoiceInclude }, receivedBy: true },
      });
      if (existing) {
        if (existing.invoiceId !== input.invoiceId) throw new ApiError(409, "DUPLICATE", "This payment was already recorded.");
        return {
          payment: toPaymentDto(existing, existing.invoice.invoiceNumber, existing.invoice.customer.name),
          invoice: toInvoiceDto(existing.invoice),
        };
      }
    }
    const locked = await lockInvoice(tx, input.invoiceId);
    if (locked.status === "DRAFT" || locked.status === "VOID") {
      throw new ApiError(409, "PAYMENT_NOT_ALLOWED", "Payments can only be recorded on issued invoices.");
    }
    const amount = money(input.amount);
    if (amount.lte(0)) throw new ApiError(400, "INVALID_AMOUNT", "Enter an amount greater than zero.");
    const current = await tx.invoice.findUniqueOrThrow({ where: { id: input.invoiceId }, include: invoiceInclude });
    const paid = netPaid(current.payments.map((payment) => ({ kind: payment.kind, amount: payment.amount.toString() })));
    const total = d(current.totalAmount.toString());
    const nextPaid = input.kind === "REFUND" ? paid.minus(amount) : paid.plus(amount);
    if (input.kind === "PAYMENT" && nextPaid.gt(total)) {
      throw new ApiError(409, "OVERPAYMENT", "The payment is more than the outstanding balance.", {
        outstanding: moneyString(outstandingAmount(total, paid)),
      });
    }
    if (input.kind === "REFUND" && amount.gt(paid)) {
      throw new ApiError(409, "REFUND_EXCEEDS_PAID", "The refund is more than the amount received.");
    }
    const payment = await tx.payment.create({
      data: {
        invoiceId: input.invoiceId,
        kind: input.kind,
        amount: moneyString(amount),
        paymentMethod: input.paymentMethod,
        paymentDate: input.paymentDate,
        reference: emptyToNull(input.reference),
        notes: emptyToNull(input.notes),
        idempotencyKey: emptyToNull(input.idempotencyKey),
        receivedById: userId,
      },
      include: { receivedBy: true },
    });
    await tx.invoice.update({
      where: { id: input.invoiceId },
      data: { status: statusFromPayments(total, nextPaid) },
    });
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: input.invoiceId }, include: invoiceInclude });
    return { payment: toPaymentDto(payment, invoice.invoiceNumber, invoice.customer.name), invoice: toInvoiceDto(invoice) };
  });
}

export async function listPayments(query: {
  page: number;
  pageSize: number;
  search?: string;
  from?: Date;
  to?: Date;
  kind?: PaymentKind;
}) {
  const where: Prisma.PaymentWhereInput = {};
  if (query.kind) where.kind = query.kind;
  if (query.from || query.to) where.paymentDate = { gte: query.from, lte: query.to };
  if (query.search) {
    where.OR = [
      { reference: { contains: query.search, mode: "insensitive" } },
      { invoice: { invoiceNumber: { contains: query.search, mode: "insensitive" } } },
      { invoice: { customer: { name: { contains: query.search, mode: "insensitive" } } } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: { receivedBy: true, invoice: { include: { customer: true } } },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    items: rows.map((row) => toPaymentDto(row, row.invoice.invoiceNumber, row.invoice.customer.name)),
    meta: pageMeta(total, query.page, query.pageSize),
  };
}

async function assertStockAvailable(tx: Prisma.TransactionClient, lines: NormalizedLine[]) {
  const required = new Map<string, Decimal>();
  for (const line of lines) {
    if (line.sourceType !== "STOCK" || !line.productId) continue;
    required.set(line.productId, (required.get(line.productId) ?? new Decimal(0)).plus(line.quantity));
  }
  for (const productId of [...required.keys()].sort()) {
    const product = await lockProduct(tx, productId);
    const need = required.get(productId) ?? new Decimal(0);
    if (product.stockQuantity.lt(need)) {
      throw new ApiError(409, "INSUFFICIENT_STOCK", `${product.name} does not have enough stock.`, {
        productId,
        productName: product.name,
        available: qtyString(product.stockQuantity),
        required: qtyString(need),
        shortfall: qtyString(need.minus(product.stockQuantity)),
      });
    }
  }
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient, prefix: string, timeZone: string) {
  const year = zonedParts(new Date(), timeZone).year;
  await tx.$executeRaw`
    INSERT INTO "InvoiceCounter" ("year", "lastNumber")
    VALUES (${year}, 0)
    ON CONFLICT ("year") DO NOTHING
  `;
  const rows = await tx.$queryRaw<Array<{ lastNumber: number }>>`
    SELECT "lastNumber" FROM "InvoiceCounter" WHERE "year" = ${year} FOR UPDATE
  `;
  const next = (rows[0]?.lastNumber ?? 0) + 1;
  await tx.invoiceCounter.update({ where: { year }, data: { lastNumber: next } });
  const safePrefix = prefix.replace(/[^A-Za-z0-9-]/g, "") || "INV";
  return `${safePrefix}-${year}-${String(next).padStart(4, "0")}`;
}

async function lockInvoice(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.$queryRaw<Array<{ id: string; status: InvoiceListItem["status"] }>>`
    SELECT "id", "status"::text AS "status" FROM "Invoice" WHERE "id" = ${id} FOR UPDATE
  `;
  const row = rows[0];
  if (!row) throw new ApiError(404, "NOT_FOUND", "Invoice not found.");
  return row;
}

async function assertActiveCustomer(tx: Db, customerId: string) {
  const customer = await tx.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new ApiError(400, "CUSTOMER_REQUIRED", "Choose a customer.");
  if (!customer.isActive) throw new ApiError(409, "CUSTOMER_ARCHIVED", "This customer is archived.");
  return customer;
}

type NormalizedLine = ReturnType<typeof lineCreateData> & { quantity: string; productId: string | null; sourceType: SourceType; unit: InventoryUnit };

async function normalizeLines(tx: Db, lines: LineInput[]) {
  if (lines.length === 0) throw new ApiError(400, "NO_LINES", "Add at least one invoice line.");
  const ids = [...new Set(lines.flatMap((line) => (line.productId ? [line.productId] : [])))];
  const products = ids.length ? await tx.product.findMany({ where: { id: { in: ids } } }) : [];
  const byId = new Map(products.map((product) => [product.id, product]));
  return lines.map((line, index) => {
    const product = line.productId ? byId.get(line.productId) : undefined;
    if (line.productId && !product) throw new ApiError(400, "PRODUCT_NOT_FOUND", "One of the selected products no longer exists.");
    if (line.sourceType === "STOCK" && !product) throw new ApiError(400, "STOCK_PRODUCT_REQUIRED", "A shop-stock line needs a product from inventory.");
    const unit = line.unit;
    if (!unit) throw new ApiError(400, "UNIT_REQUIRED", "Choose a unit for each line.");
    let quantity;
    try {
      quantity = computeBilledQuantity({
        unit,
        quantity: line.quantity,
        width: line.width,
        height: line.height,
        dimensionUnit: line.dimensionUnit,
        pieceCount: line.pieceCount,
      });
    } catch (error) {
      throw mapCalcError(error);
    }
    const itemName = (line.itemName || product?.name || "").trim();
    if (!itemName) throw new ApiError(400, "ITEM_NAME_REQUIRED", "Each line needs a name.");
    let lineTotal;
    try {
      lineTotal = computeLineTotal(quantity, line.unitPrice, line.discountAmount || 0);
    } catch (error) {
      throw mapCalcError(error);
    }
    const purchase = line.sourceType === "OUTSIDE_PURCHASE" && line.purchaseCost ? money(line.purchaseCost) : null;
    if (purchase?.isNegative()) throw new ApiError(400, "INVALID_AMOUNT", "Purchase cost cannot be negative.");
    return {
      productId: product?.id ?? null,
      itemName,
      description: emptyToNull(line.description),
      sourceType: line.sourceType,
      quantity: quantity.toFixed(3),
      unit,
      width: line.width ? qty(line.width).toFixed(3) : null,
      height: line.height ? qty(line.height).toFixed(3) : null,
      dimensionUnit: line.dimensionUnit ?? null,
      pieceCount: line.pieceCount ?? null,
      unitPrice: moneyString(line.unitPrice),
      discountAmount: moneyString(line.discountAmount || 0),
      lineTotal: lineTotal.toFixed(2),
      purchaseCost: purchase ? purchase.toFixed(2) : null,
      supplierName: line.sourceType === "OUTSIDE_PURCHASE" ? emptyToNull(line.supplierName) : null,
      supplierReference: line.sourceType === "OUTSIDE_PURCHASE" ? emptyToNull(line.supplierReference) : null,
      purchaseNotes: line.sourceType === "OUTSIDE_PURCHASE" ? emptyToNull(line.purchaseNotes) : null,
      sortOrder: index,
    };
  });
}

function totalsFor(lines: Array<{ lineTotal: string }>, discount: string | null | undefined, taxEnabled: boolean, taxRate: string) {
  try {
    return computeInvoiceTotals({
      lineTotals: lines.map((line) => line.lineTotal),
      invoiceDiscount: discount || 0,
      taxEnabled,
      taxRatePercent: taxRate,
    });
  } catch (error) {
    throw mapCalcError(error);
  }
}

function totalData(totals: ReturnType<typeof computeInvoiceTotals>) {
  return {
    subtotal: totals.subtotal.toFixed(2),
    discountAmount: totals.discountAmount.toFixed(2),
    taxAmount: totals.taxAmount.toFixed(2),
    totalAmount: totals.totalAmount.toFixed(2),
  };
}

function lineCreateData(line: Awaited<ReturnType<typeof normalizeLines>>[number]) {
  return {
    productId: line.productId,
    itemName: line.itemName,
    description: line.description,
    sourceType: line.sourceType,
    quantity: line.quantity,
    unit: line.unit,
    width: line.width,
    height: line.height,
    dimensionUnit: line.dimensionUnit,
    pieceCount: line.pieceCount,
    unitPrice: line.unitPrice,
    discountAmount: line.discountAmount,
    lineTotal: line.lineTotal,
    purchaseCost: line.purchaseCost,
    supplierName: line.supplierName,
    supplierReference: line.supplierReference,
    purchaseNotes: line.purchaseNotes,
    sortOrder: line.sortOrder,
  };
}

function storedLineToInput(line: InvoiceLine): LineInput {
  return {
    productId: line.productId,
    itemName: line.itemName,
    description: line.description,
    sourceType: line.sourceType,
    quantity: line.quantity.toString(),
    unit: line.unit,
    width: line.width?.toString() ?? null,
    height: line.height?.toString() ?? null,
    dimensionUnit: line.dimensionUnit,
    pieceCount: line.pieceCount,
    unitPrice: line.unitPrice.toString(),
    discountAmount: line.discountAmount.toString(),
    purchaseCost: line.purchaseCost?.toString() ?? null,
    supplierName: line.supplierName,
    supplierReference: line.supplierReference,
    purchaseNotes: line.purchaseNotes,
  };
}

function toInvoiceDto(invoice: InvoiceRecord): InvoiceDto {
  const paid = netPaid(invoice.payments.map((payment) => ({ kind: payment.kind, amount: payment.amount.toString() })));
  const commercial = invoice.status !== "DRAFT" && invoice.status !== "VOID";
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName: invoice.customer.name,
    customerPhone: invoice.customer.phone,
    customerEmail: invoice.customer.email,
    customerAddress: invoice.customer.address,
    status: invoice.status,
    invoiceDate: invoice.invoiceDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString() ?? null,
    subtotal: moneyString(invoice.subtotal.toString()),
    discountAmount: moneyString(invoice.discountAmount.toString()),
    taxAmount: moneyString(invoice.taxAmount.toString()),
    totalAmount: moneyString(invoice.totalAmount.toString()),
    amountPaid: moneyString(paid),
    outstanding: commercial ? moneyString(outstandingAmount(invoice.totalAmount.toString(), paid)) : moneyString(0),
    notes: invoice.notes,
    terms: invoice.terms,
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    voidedAt: invoice.voidedAt?.toISOString() ?? null,
    voidReason: invoice.voidReason,
    lines: invoice.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      itemName: line.itemName,
      description: line.description,
      sourceType: line.sourceType,
      quantity: qtyString(line.quantity.toString()),
      unit: line.unit,
      width: line.width ? qtyString(line.width.toString()) : null,
      height: line.height ? qtyString(line.height.toString()) : null,
      dimensionUnit: line.dimensionUnit,
      pieceCount: line.pieceCount,
      unitPrice: moneyString(line.unitPrice.toString()),
      discountAmount: moneyString(line.discountAmount.toString()),
      lineTotal: moneyString(line.lineTotal.toString()),
      purchaseCost: line.purchaseCost?.toString() ?? null,
      supplierName: line.supplierName,
      supplierReference: line.supplierReference,
      purchaseNotes: line.purchaseNotes,
    })),
    payments: invoice.payments.map((payment) => toPaymentDto(payment, invoice.invoiceNumber, invoice.customer.name)),
  };
}

function toListItem(invoice: {
  id: string;
  invoiceNumber: string | null;
  customerId: string;
  invoiceDate: Date;
  dueDate: Date | null;
  status: InvoiceListItem["status"];
  totalAmount: { toString(): string };
  customer: { name: string; phone: string };
  payments: Array<{ kind: "PAYMENT" | "REFUND"; amount: { toString(): string } }>;
}): InvoiceListItem {
  const paid = netPaid(invoice.payments.map((payment) => ({ kind: payment.kind, amount: payment.amount.toString() })));
  const commercial = invoice.status !== "DRAFT" && invoice.status !== "VOID";
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName: invoice.customer.name,
    customerPhone: invoice.customer.phone,
    invoiceDate: invoice.invoiceDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString() ?? null,
    status: invoice.status,
    totalAmount: invoice.totalAmount.toString(),
    amountPaid: moneyString(paid),
    outstanding: commercial ? moneyString(outstandingAmount(invoice.totalAmount.toString(), paid)) : moneyString(0),
  };
}

function toPaymentDto(
  payment: {
    id: string;
    invoiceId: string;
    kind: "PAYMENT" | "REFUND";
    amount: { toString(): string };
    paymentMethod: string;
    paymentDate: Date;
    reference: string | null;
    notes: string | null;
    createdAt: Date;
    receivedBy: { name: string };
  },
  invoiceNumber: string | null,
  customerName: string,
): PaymentDto {
  return {
    id: payment.id,
    invoiceId: payment.invoiceId,
    invoiceNumber,
    customerName,
    kind: payment.kind,
    amount: payment.amount.toString(),
    paymentMethod: payment.paymentMethod,
    paymentDate: payment.paymentDate.toISOString(),
    reference: payment.reference,
    notes: payment.notes,
    receivedByName: payment.receivedBy.name,
    createdAt: payment.createdAt.toISOString(),
  };
}

function invoiceWhere(query: {
  search?: string;
  status?: InvoiceListItem["status"];
  customerId?: string;
  from?: Date;
  to?: Date;
}): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.customerId) where.customerId = query.customerId;
  if (query.from || query.to) where.invoiceDate = { gte: query.from, lte: query.to };
  if (query.search) {
    where.OR = [
      { invoiceNumber: { contains: query.search, mode: "insensitive" } },
      { customer: { name: { contains: query.search, mode: "insensitive" } } },
      { customer: { phone: { contains: query.search, mode: "insensitive" } } },
    ];
  }
  return where;
}

function mapCalcError(error: unknown): ApiError {
  const message = error instanceof Error ? error.message : "";
  if (message === "DIMENSIONS_INCOMPLETE") return new ApiError(400, "DIMENSIONS_INCOMPLETE", "Enter both width and height, or leave both blank.");
  if (message === "INVALID_PIECES") return new ApiError(400, "INVALID_PIECES", "Piece count must be a whole number greater than zero.");
  if (message === "INVALID_DIMENSIONS") return new ApiError(400, "INVALID_DIMENSIONS", "Dimensions must be greater than zero.");
  if (message === "DISCOUNT_EXCEEDS_LINE") return new ApiError(400, "DISCOUNT_EXCEEDS_LINE", "A line discount cannot exceed the line amount.");
  if (message === "DISCOUNT_EXCEEDS_SUBTOTAL") return new ApiError(400, "DISCOUNT_EXCEEDS_SUBTOTAL", "The invoice discount cannot exceed the subtotal.");
  if (message === "INVALID_AMOUNT" || message === "INVALID_NUMBER") return new ApiError(400, "INVALID_AMOUNT", "Enter valid amounts and quantities.");
  if (error instanceof ApiError) return error;
  return new ApiError(400, "INVALID_AMOUNT", "Enter valid amounts and quantities.");
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function salesTrend(timeZone: string) {
  const start = startOfMonthOffset(new Date(), timeZone, -5);
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: [...OPEN_STATUSES] }, issuedAt: { gte: start } },
    select: { issuedAt: true, totalAmount: true },
  });
  const buckets = new Map<string, Decimal>();
  for (let offset = -5; offset <= 0; offset += 1) {
    const cursor = startOfMonthOffset(new Date(), timeZone, offset);
    buckets.set(monthKey(cursor, timeZone), new Decimal(0));
  }
  for (const invoice of invoices) {
    if (!invoice.issuedAt) continue;
    const key = monthKey(invoice.issuedAt, timeZone);
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? new Decimal(0)).plus(invoice.totalAmount.toString()));
  }
  return [...buckets.entries()].map(([month, total]) => ({
    month,
    label: new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone }).format(new Date(`${month}-01T12:00:00.000Z`)),
    total: moneyString(total),
  }));
}

export { toListItem, OPEN_STATUSES };
