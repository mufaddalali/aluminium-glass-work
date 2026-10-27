"use client";

import { useQuery } from "@tanstack/react-query";
import gsap from "gsap";
import { AlertTriangle, FileText, Package, Plus, Users } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { getDashboard } from "@/features/dashboard/services/dashboard.service";
import { formatDateOnly, formatMoney } from "@/lib/format";
import { queryKeys } from "@/query/query-keys";

const SalesChart = dynamic(() => import("@/features/dashboard/components/sales-chart").then((module) => module.SalesChart), { ssr: false });

export function DashboardPage() {
  const ref = useRef<HTMLDivElement>(null);
  const dashboard = useQuery({ queryKey: queryKeys.dashboard.summary, queryFn: getDashboard });
  useEffect(() => {
    if (!ref.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.from("[data-enter]", { y: 8, opacity: 0, duration: 0.35, stagger: 0.04, ease: "power2.out" });
    }, ref);
    return () => context.revert();
  }, [dashboard.data]);
  if (dashboard.isLoading) return <TableSkeleton />;
  if (!dashboard.data) return <ErrorState onRetry={() => void dashboard.refetch()} />;
  const data = dashboard.data;
  const currency = data.currency;
  return (
    <div ref={ref} className="space-y-8">
      <div data-enter className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">Today</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Shop overview</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link href="/invoices/new"><Plus className="h-4 w-4" />Invoice</Link></Button>
          <Button variant="outline" asChild><Link href="/inventory/new">Add product</Link></Button>
          <Button variant="outline" asChild><Link href="/customers/new"><Users className="h-4 w-4" />Customer</Link></Button>
        </div>
      </div>
      {data.pendingPayments.length > 0 ? (
        <section data-enter className="surface-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="h-4 w-4 text-warning" />Pending payments</h2>
          <div className="mt-4 space-y-3">
            {data.pendingPayments.map((invoice) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                <span>{invoice.invoiceNumber} · {invoice.customerName}{invoice.overdue ? " · overdue" : ""}</span>
                <span className="font-medium">{formatMoney(invoice.outstanding, currency)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card label="Sales this month" value={formatMoney(data.salesThisMonth, currency)} />
        <Card label="Payments this month" value={formatMoney(data.paymentsThisMonth, currency)} />
        <Card label="Outstanding" value={formatMoney(data.outstandingReceivables, currency)} />
        <Card label="Invoices this month" value={String(data.issuedInvoiceCount)} />
        <Card label="Low stock" value={String(data.lowStockCount)} />
        <Card label="Out of stock" value={String(data.outOfStockCount)} />
      </div>
      <section data-enter className="surface-card p-5">
        <h2 className="text-lg font-semibold">Sales trend</h2>
        <div className="mt-4 h-64">
          <SalesChart points={data.salesTrend} />
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><FileText className="h-4 w-4" />Recent invoices</h2>
          <div className="mt-4 space-y-3 text-sm">
            {data.recentInvoices.map((invoice) => <Link key={invoice.id} className="flex justify-between border-t border-border pt-3" href={`/invoices/${invoice.id}`}><span>{invoice.invoiceNumber ?? "Draft"} · {invoice.customerName}</span><span>{formatDateOnly(invoice.invoiceDate)}</span></Link>)}
            {data.recentInvoices.length === 0 ? <p className="text-muted-foreground">No invoices yet.</p> : null}
          </div>
        </section>
        <section className="surface-card p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Package className="h-4 w-4" />Low stock</h2>
          <div className="mt-4 space-y-3 text-sm">
            {data.lowStock.map((product) => <Link key={product.id} className="flex justify-between border-t border-border pt-3" href={`/inventory/${product.id}`}><span>{product.name}</span><span>{product.stockQuantity}</span></Link>)}
            {data.lowStock.length === 0 ? <p className="text-muted-foreground">No low-stock products.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return <div data-enter className="surface-card interactive-lift p-5"><p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>;
}
