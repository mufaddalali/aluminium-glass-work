import { Prisma } from "@prisma/client";
import { netPaid, outstandingAmount } from "@/lib/invoice-math";
import { moneyString } from "@/lib/money";
import type { CustomerDto, InvoiceListItem } from "@/lib/types";
import { prisma } from "@/server/db/prisma";
import { ApiError } from "@/server/errors/api-error";
import { pageMeta } from "@/server/utils/paging";

const ACTIVE_STATUSES = ["ISSUED", "PARTIALLY_PAID", "PAID"] as const;

export type CustomerInput = {
  name: string;
  phone: string;
  alternatePhone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export async function listCustomers(query: { page: number; pageSize: number; search?: string; active?: boolean }) {
  const where: Prisma.CustomerWhereInput = {};
  if (query.active === true) where.isActive = true;
  if (query.active === false) where.isActive = false;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
      { alternatePhone: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }
  const [total, rows] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  const balances = await balancesFor(rows.map((row) => row.id));
  return {
    items: rows.map((row) => toCustomerDto(row, balances.get(row.id))),
    meta: pageMeta(total, query.page, query.pageSize),
  };
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new ApiError(404, "NOT_FOUND", "Customer not found.");
  const balances = await balancesFor([id]);
  const invoices = await prisma.invoice.findMany({
    where: { customerId: id },
    include: { customer: true, payments: true },
    orderBy: { invoiceDate: "desc" },
    take: 50,
  });
  return {
    ...toCustomerDto(customer, balances.get(id)),
    invoices: invoices.map(toInvoiceListItem),
  };
}

export async function createCustomer(input: CustomerInput) {
  const customer = await prisma.customer.create({ data: customerData(input) });
  return toCustomerDto(customer, emptyBalance());
}

export async function updateCustomer(id: string, input: CustomerInput) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Customer not found.");
  const customer = await prisma.customer.update({ where: { id }, data: customerData(input) });
  const balances = await balancesFor([id]);
  return toCustomerDto(customer, balances.get(id));
}

export async function deleteCustomers(ids: string[]) {
  const unique = [...new Set(ids)];
  const customers = await prisma.customer.findMany({
    where: { id: { in: unique } },
    select: { id: true, _count: { select: { invoices: true } } },
  });
  const deletable = customers.filter((customer) => customer._count.invoices === 0).map((customer) => customer.id);
  if (deletable.length > 0) await prisma.customer.deleteMany({ where: { id: { in: deletable } } });
  return { deleted: deletable.length, blocked: customers.length - deletable.length };
}

export async function deleteCustomer(id: string) {
  const existing = await prisma.customer.findUnique({ where: { id }, include: { _count: { select: { invoices: true } } } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Customer not found.");
  if (existing._count.invoices > 0) {
    throw new ApiError(409, "CUSTOMER_IN_USE", "This customer has invoices and cannot be deleted.");
  }
  await prisma.customer.delete({ where: { id } });
  return { id };
}

export async function archiveCustomer(id: string) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Customer not found.");
  const customer = await prisma.customer.update({ where: { id }, data: { isActive: false } });
  const balances = await balancesFor([id]);
  return toCustomerDto(customer, balances.get(id));
}

async function balancesFor(ids: string[]) {
  const map = new Map<string, { invoiced: ReturnType<typeof netPaid>; paid: ReturnType<typeof netPaid> }>();
  if (ids.length === 0) return map;
  const invoices = await prisma.invoice.findMany({
    where: { customerId: { in: ids }, status: { in: [...ACTIVE_STATUSES] } },
    select: { customerId: true, totalAmount: true, payments: { select: { amount: true, kind: true } } },
  });
  for (const invoice of invoices) {
    const current = map.get(invoice.customerId) ?? emptyBalance();
    const paid = netPaid(invoice.payments.map((payment) => ({ kind: payment.kind, amount: payment.amount.toString() })));
    map.set(invoice.customerId, {
      invoiced: current.invoiced.plus(invoice.totalAmount.toString()),
      paid: current.paid.plus(paid),
    });
  }
  return map;
}

function emptyBalance() {
  return { invoiced: netPaid([]), paid: netPaid([]) };
}

function toCustomerDto(
  customer: {
    id: string;
    name: string;
    phone: string;
    alternatePhone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    isActive: boolean;
  },
  balance?: { invoiced: { toString(): string }; paid: { toString(): string } },
): CustomerDto {
  const invoiced = balance?.invoiced ?? netPaid([]);
  const paid = balance?.paid ?? netPaid([]);
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    alternatePhone: customer.alternatePhone,
    email: customer.email,
    address: customer.address,
    notes: customer.notes,
    isActive: customer.isActive,
    totalInvoiced: moneyString(invoiced.toString()),
    totalPaid: moneyString(paid.toString()),
    outstanding: moneyString(outstandingAmount(invoiced.toString(), paid.toString())),
  };
}

function customerData(input: CustomerInput) {
  return {
    name: input.name.trim(),
    phone: input.phone.trim(),
    alternatePhone: emptyToNull(input.alternatePhone),
    email: emptyToNull(input.email)?.toLowerCase() ?? null,
    address: emptyToNull(input.address),
    notes: emptyToNull(input.notes),
  };
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toInvoiceListItem(invoice: {
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
  const total = invoice.totalAmount.toString();
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName: invoice.customer.name,
    customerPhone: invoice.customer.phone,
    invoiceDate: invoice.invoiceDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString() ?? null,
    status: invoice.status,
    totalAmount: total,
    amountPaid: moneyString(paid),
    outstanding: invoice.status === "VOID" || invoice.status === "DRAFT" ? moneyString(0) : moneyString(outstandingAmount(total, paid)),
  };
}
