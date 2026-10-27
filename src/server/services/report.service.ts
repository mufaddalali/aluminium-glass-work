import { Prisma } from "@prisma/client";
import { toCsv } from "@/lib/csv";
import { formatDateOnly, formatMoney, formatQuantity } from "@/lib/format";
import { UNIT_LABELS } from "@/lib/glass";
import { netPaid, outstandingAmount } from "@/lib/invoice-math";
import { d, money } from "@/lib/money";
import type { PageMeta } from "@/lib/types";
import { listMovements } from "@/server/services/inventory.service";
import { ensureSettings } from "@/server/services/settings.service";
import { prisma } from "@/server/db/prisma";
import { ApiError } from "@/server/errors/api-error";
import { pageMeta } from "@/server/utils/paging";

const SALES_STATUSES = ["ISSUED", "PARTIALLY_PAID", "PAID"] as const;

export const REPORT_TYPES = [
  "sales",
  "invoices",
  "outstanding",
  "customers",
  "stock",
  "movements",
  "payments",
  "outside",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export type ReportTable = {
  type: ReportType;
  title: string;
  description: string;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string>>;
  meta: PageMeta;
};

export async function getReport(type: ReportType, query: {
  page: number;
  pageSize: number;
  search?: string;
  from?: Date;
  to?: Date;
}): Promise<ReportTable> {
  const settings = await ensureSettings();
  const currency = settings.currency;
  switch (type) {
    case "sales":
    case "invoices":
      return invoiceReport(type, query, currency);
    case "outstanding":
      return invoiceReport(type, query, currency);
    case "customers":
      return customerReport(query, currency);
    case "stock":
      return stockReport(query, currency);
    case "movements":
      return movementReport(query);
    case "payments":
      return paymentReport(query, currency);
    case "outside":
      return outsideReport(query, currency);
    default:
      throw new ApiError(400, "UNKNOWN_REPORT", "Choose a report.");
  }
}

export function reportToCsv(report: ReportTable) {
  return toCsv(
    report.columns.map((column) => column.label),
    report.rows.map((row) => report.columns.map((column) => row[column.key] ?? "")),
  );
}

async function invoiceReport(type: ReportType, query: { page: number; pageSize: number; search?: string; from?: Date; to?: Date }, currency: string): Promise<ReportTable> {
  const where: Prisma.InvoiceWhereInput = {
    status: type === "outstanding" ? { in: ["ISSUED", "PARTIALLY_PAID"] } : { in: [...SALES_STATUSES] },
  };
  if (type === "sales") where.issuedAt = { gte: query.from, lte: query.to };
  if (type === "invoices" && (query.from || query.to)) where.issuedAt = { gte: query.from, lte: query.to };
  if (query.search) {
    where.OR = [
      { invoiceNumber: { contains: query.search, mode: "insensitive" } },
      { customer: { name: { contains: query.search, mode: "insensitive" } } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: { customer: true, payments: true },
      orderBy: { issuedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    type,
    title: type === "outstanding" ? "Outstanding invoices" : type === "sales" ? "Sales" : "Issued invoices",
    description:
      type === "outstanding"
        ? "Issued and partially paid invoices. Drafts and void invoices are excluded."
        : "Issued, partially paid, and paid invoices. Drafts and void invoices are excluded. Totals are sales, not profit.",
    columns: [
      { key: "number", label: "Invoice" },
      { key: "customer", label: "Customer" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
      { key: "total", label: "Total" },
      { key: "paid", label: "Paid" },
      { key: "outstanding", label: "Outstanding" },
    ],
    rows: rows.map((invoice) => {
      const paid = netPaid(invoice.payments.map((payment) => ({ kind: payment.kind, amount: payment.amount.toString() })));
      return {
        number: invoice.invoiceNumber ?? "Draft",
        customer: invoice.customer.name,
        date: formatDateOnly(invoice.issuedAt ?? invoice.invoiceDate),
        status: invoice.status,
        total: formatMoney(invoice.totalAmount.toString(), currency),
        paid: formatMoney(paid, currency),
        outstanding: formatMoney(outstandingAmount(invoice.totalAmount.toString(), paid), currency),
      };
    }),
    meta: pageMeta(total, query.page, query.pageSize),
  };
}

async function customerReport(query: { page: number; pageSize: number; search?: string }, currency: string): Promise<ReportTable> {
  const where: Prisma.CustomerWhereInput = query.search
    ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { phone: { contains: query.search, mode: "insensitive" } }] }
    : {};
  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  const invoices = customers.length
    ? await prisma.invoice.findMany({
        where: { customerId: { in: customers.map((customer) => customer.id) }, status: { in: [...SALES_STATUSES] } },
        select: { customerId: true, totalAmount: true, payments: { select: { amount: true, kind: true } } },
      })
    : [];
  const balances = new Map<string, { invoiced: ReturnType<typeof money>; paid: ReturnType<typeof money> }>();
  for (const invoice of invoices) {
    const current = balances.get(invoice.customerId) ?? { invoiced: money(0), paid: money(0) };
    const paid = netPaid(invoice.payments.map((payment) => ({ kind: payment.kind, amount: payment.amount.toString() })));
    balances.set(invoice.customerId, { invoiced: current.invoiced.plus(invoice.totalAmount.toString()), paid: current.paid.plus(paid) });
  }
  return {
    type: "customers",
    title: "Customer balances",
    description: "Balances are calculated from issued invoices and recorded payments. Drafts and void invoices are excluded.",
    columns: [
      { key: "customer", label: "Customer" },
      { key: "phone", label: "Phone" },
      { key: "invoiced", label: "Invoiced" },
      { key: "paid", label: "Paid" },
      { key: "outstanding", label: "Outstanding" },
    ],
    rows: customers.map((customer) => {
      const balance = balances.get(customer.id) ?? { invoiced: money(0), paid: money(0) };
      return {
        customer: customer.name,
        phone: customer.phone,
        invoiced: formatMoney(balance.invoiced, currency),
        paid: formatMoney(balance.paid, currency),
        outstanding: formatMoney(outstandingAmount(balance.invoiced, balance.paid), currency),
      };
    }),
    meta: pageMeta(total, query.page, query.pageSize),
  };
}

async function stockReport(query: { page: number; pageSize: number; search?: string }, currency: string): Promise<ReportTable> {
  const search = query.search ? `%${query.search}%` : null;
  const searchSql = search ? Prisma.sql`AND (p."name" ILIKE ${search} OR COALESCE(p."description", '') ILIKE ${search})` : Prisma.empty;
  const countRows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "Product" p
    WHERE TRUE ${searchSql}
  `;
  const idRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT p."id" FROM "Product" p
    WHERE TRUE ${searchSql}
    ORDER BY p."name" ASC
    LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
  `;
  const products = idRows.length
    ? await prisma.product.findMany({ where: { id: { in: idRows.map((row) => row.id) } } })
    : [];
  const byId = new Map(products.map((product) => [product.id, product]));
  return {
    type: "stock",
    title: "Stock on hand",
    description: "Current quantity and selling price of each product.",
    columns: [
      { key: "product", label: "Name" },
      { key: "quantity", label: "Quantity" },
      { key: "price", label: "Default selling price" },
      { key: "description", label: "Description" },
    ],
    rows: idRows.flatMap((row) => {
      const product = byId.get(row.id);
      if (!product) return [];
      return [{
        product: product.name,
        quantity: formatQuantity(product.stockQuantity.toString()),
        price: formatMoney(product.defaultSellingPrice.toString(), currency),
        description: product.description ?? "",
      }];
    }),
    meta: pageMeta(countRows[0]?.count ?? 0, query.page, query.pageSize),
  };
}

async function movementReport(query: { page: number; pageSize: number; search?: string; from?: Date; to?: Date }): Promise<ReportTable> {
  const result = await listMovements(query);
  return {
    type: "movements",
    title: "Stock movements",
    description: "Every recorded inventory change. Historical rows are not editable.",
    columns: [
      { key: "date", label: "Date" },
      { key: "product", label: "Product" },
      { key: "direction", label: "Direction" },
      { key: "quantity", label: "Quantity" },
      { key: "before", label: "Before" },
      { key: "after", label: "After" },
      { key: "reason", label: "Reason" },
      { key: "invoice", label: "Invoice" },
      { key: "user", label: "User" },
    ],
    rows: result.items.map((item) => ({
      date: formatDateOnly(item.occurredAt),
      product: item.productName,
      direction: item.direction,
      quantity: `${formatQuantity(item.quantity)} ${UNIT_LABELS[item.unit]}`,
      before: item.stockBefore ? formatQuantity(item.stockBefore) : "",
      after: item.stockAfter ? formatQuantity(item.stockAfter) : "",
      reason: item.reason,
      invoice: item.invoiceNumber ?? "",
      user: item.createdByName,
    })),
    meta: result.meta,
  };
}

async function paymentReport(query: { page: number; pageSize: number; search?: string; from?: Date; to?: Date }, currency: string): Promise<ReportTable> {
  const where: Prisma.PaymentWhereInput = {};
  if (query.from || query.to) where.paymentDate = { gte: query.from, lte: query.to };
  if (query.search) {
    where.OR = [
      { reference: { contains: query.search, mode: "insensitive" } },
      { invoice: { customer: { name: { contains: query.search, mode: "insensitive" } } } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: { invoice: { include: { customer: true } }, receivedBy: true },
      orderBy: { paymentDate: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    type: "payments",
    title: "Payments received",
    description: "Each row is a recorded payment or refund. Invoice status is not edited by hand.",
    columns: [
      { key: "date", label: "Date" },
      { key: "invoice", label: "Invoice" },
      { key: "customer", label: "Customer" },
      { key: "kind", label: "Kind" },
      { key: "method", label: "Method" },
      { key: "amount", label: "Amount" },
      { key: "reference", label: "Reference" },
    ],
    rows: rows.map((row) => ({
      date: formatDateOnly(row.paymentDate),
      invoice: row.invoice.invoiceNumber ?? "",
      customer: row.invoice.customer.name,
      kind: row.kind,
      method: row.paymentMethod,
      amount: formatMoney(row.amount.toString(), currency),
      reference: row.reference ?? "",
    })),
    meta: pageMeta(total, query.page, query.pageSize),
  };
}

async function outsideReport(query: { page: number; pageSize: number; search?: string; from?: Date; to?: Date }, currency: string): Promise<ReportTable> {
  const where: Prisma.InvoiceLineWhereInput = {
    sourceType: "OUTSIDE_PURCHASE",
    invoice: { status: { in: [...SALES_STATUSES] }, ...(query.from || query.to ? { issuedAt: { gte: query.from, lte: query.to } } : {}) },
  };
  if (query.search) {
    where.OR = [
      { itemName: { contains: query.search, mode: "insensitive" } },
      { supplierName: { contains: query.search, mode: "insensitive" } },
      { invoice: { customer: { name: { contains: query.search, mode: "insensitive" } } } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.invoiceLine.count({ where }),
    prisma.invoiceLine.findMany({
      where,
      include: { invoice: { include: { customer: true } } },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    type: "outside",
    title: "Outside purchases",
    description: "Lines bought from a supplier for a customer. Estimated margin is the line total minus recorded unit cost times quantity. It is not accounting profit, and lines without a cost are left blank.",
    columns: [
      { key: "invoice", label: "Invoice" },
      { key: "customer", label: "Customer" },
      { key: "item", label: "Item" },
      { key: "supplier", label: "Supplier" },
      { key: "quantity", label: "Quantity" },
      { key: "sold", label: "Line total" },
      { key: "cost", label: "Unit cost" },
      { key: "margin", label: "Estimated margin" },
    ],
    rows: rows.map((line) => {
      const cost = line.purchaseCost ? d(line.purchaseCost.toString()) : null;
      const margin = cost ? money(d(line.lineTotal.toString()).minus(cost.mul(line.quantity.toString()))) : null;
      return {
        invoice: line.invoice.invoiceNumber ?? "",
        customer: line.invoice.customer.name,
        item: line.itemName,
        supplier: line.supplierName ?? "",
        quantity: `${formatQuantity(line.quantity.toString())} ${UNIT_LABELS[line.unit]}`,
        sold: formatMoney(line.lineTotal.toString(), currency),
        cost: cost ? formatMoney(cost, currency) : "",
        margin: margin ? formatMoney(margin, currency) : "",
      };
    }),
    meta: pageMeta(total, query.page, query.pageSize),
  };
}
