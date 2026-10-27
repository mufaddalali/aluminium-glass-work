import { netPaid, outstandingAmount } from "@/lib/invoice-math";
import { money, moneyString } from "@/lib/money";
import { startOfMonthOffset, startOfZonedMonth, zonedParts } from "@/lib/timezone";
import type { DashboardDto, InvoiceListItem } from "@/lib/types";
import { countOutOfStock } from "@/server/services/inventory.service";
import { listPayments, salesTrend, toListItem } from "@/server/services/invoice.service";
import { ensureSettings } from "@/server/services/settings.service";
import { prisma } from "@/server/db/prisma";

const SALES_STATUSES = ["ISSUED", "PARTIALLY_PAID", "PAID"] as const;

export async function getDashboard(): Promise<DashboardDto> {
  const settings = await ensureSettings();
  const timeZone = settings.timeZone;
  const start = startOfZonedMonth(new Date(), timeZone);
  const next = startOfMonthOffset(new Date(), timeZone, 1);
  const [sales, paymentRows, openInvoices, outOfStockCount, recentInvoices, recentPayments, trend, pending] = await Promise.all([
    prisma.invoice.aggregate({
      where: { status: { in: [...SALES_STATUSES] }, issuedAt: { gte: start, lt: next } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.payment.findMany({
      where: { kind: "PAYMENT", paymentDate: { gte: start, lt: next } },
      select: { amount: true },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      select: { totalAmount: true, payments: { select: { amount: true, kind: true } } },
    }),
    countOutOfStock(),
    prisma.invoice.findMany({
      include: { customer: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    listPayments({ page: 1, pageSize: 6 }),
    salesTrend(timeZone),
    prisma.invoice.findMany({
      where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      include: { customer: true, payments: true },
      orderBy: [{ dueDate: "asc" }, { invoiceDate: "asc" }],
      take: 8,
    }),
  ]);

  const paymentsThisMonth = paymentRows.reduce((sum, row) => sum.plus(row.amount.toString()), money(0));
  const outstanding = openInvoices.reduce((sum, invoice) => {
    const paid = netPaid(invoice.payments.map((payment) => ({ kind: payment.kind, amount: payment.amount.toString() })));
    return sum.plus(outstandingAmount(invoice.totalAmount.toString(), paid));
  }, money(0));

  return {
    currency: settings.currency,
    timeZone,
    salesThisMonth: moneyString(sales._sum.totalAmount?.toString() ?? 0),
    paymentsThisMonth: moneyString(paymentsThisMonth),
    outstandingReceivables: moneyString(outstanding),
    issuedInvoiceCount: sales._count,
    outOfStockCount,
    pendingPayments: pending.map((invoice) => withOverdue(toListItem(invoice), timeZone)),
    recentInvoices: recentInvoices.map(toListItem),
    recentPayments: recentPayments.items,
    salesTrend: trend,
  };
}

function withOverdue(item: InvoiceListItem, timeZone: string): InvoiceListItem & { overdue: boolean } {
  const today = zonedParts(new Date(), timeZone);
  const todayStamp = Date.UTC(today.year, today.month - 1, today.day);
  const overdue = Boolean(item.dueDate && new Date(item.dueDate).getTime() < todayStamp && item.status !== "PAID" && item.status !== "VOID");
  return { ...item, overdue };
}
