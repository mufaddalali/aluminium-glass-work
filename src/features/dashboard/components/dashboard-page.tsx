"use client";

import { useQuery } from "@tanstack/react-query";
import gsap from "gsap";
import { AlertTriangle, ArrowUpRight, FileText, Package, Plus, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeleton";
import { getDashboard } from "@/features/dashboard/services/dashboard.service";
import { formatMoney } from "@/lib/format";
import { queryKeys } from "@/query/query-keys";

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
    <div ref={ref} className="space-y-5">
      <div data-enter className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Shop overview</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Sales, stock, and balances for the workshop.</p>
        </header>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link href="/invoices/new"><Plus className="h-4 w-4" />Invoice</Link></Button>
          <Button variant="outline" asChild><Link href="/inventory/new">Add product</Link></Button>
          <Button variant="outline" asChild><Link href="/customers/new"><Users className="h-4 w-4" />Customer</Link></Button>
        </div>
      </div>
      <div data-enter className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(16rem,2fr)]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat href="/reports" label="Sales this month" hint="Issued invoices this month" value={formatMoney(data.salesThisMonth, currency)} icon={FileText} wash="from-primary/14 via-primary/5" iconClass="bg-primary/12 text-primary ring-primary/15" />
          <Stat href="/payments" label="Payments this month" hint="Money received this month" value={formatMoney(data.paymentsThisMonth, currency)} icon={Wallet} wash="from-accent/16 via-accent/5" iconClass="bg-accent/15 text-accent ring-accent/20" />
          <Stat href="/invoices" label="Outstanding" hint="Still owed by customers" value={formatMoney(data.outstandingReceivables, currency)} icon={AlertTriangle} wash="from-primary/8 via-accent/10" iconClass="bg-secondary text-secondary-foreground ring-border/70" />
          <Stat href="/invoices" label="Invoices this month" hint="Issued, not drafts" value={String(data.issuedInvoiceCount)} icon={FileText} wash="from-primary/10 via-transparent" iconClass="bg-primary/12 text-primary ring-primary/15" />
          <Stat href="/inventory" label="Out of stock" hint="Nothing left to sell" value={String(data.outOfStockCount)} icon={Package} wash="from-primary/8 via-transparent" iconClass="bg-secondary text-secondary-foreground ring-border/70" />
        </div>
        <section className="surface-card p-5 lg:sticky lg:top-20">
          <h2 className="text-base font-semibold tracking-tight">Pending payments</h2>
          <div className="mt-4 space-y-3">
            {data.pendingPayments.map((invoice) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                <span>{invoice.invoiceNumber} · {invoice.customerName}{invoice.overdue ? " · overdue" : ""}</span>
                <span className="font-medium">{formatMoney(invoice.outstanding, currency)}</span>
              </Link>
            ))}
            {data.pendingPayments.length === 0 ? <p className="text-sm text-muted-foreground">No balances are waiting.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ href, label, hint, value, icon: Icon, wash, iconClass }: { href: string; label: string; hint: string; value: string; icon: typeof FileText; wash: string; iconClass: string }) {
  return (
    <Link href={href} className="group block rounded-[28px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
      <div className="surface-card interactive-lift relative h-full overflow-hidden p-4">
        <div className={`pointer-events-none absolute inset-0 bg-linear-to-br ${wash} to-transparent`} />
        <div className="relative flex items-start justify-between gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${iconClass}`}><Icon className="h-4 w-4" aria-hidden /></span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground ring-1 ring-border/70"><ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></span>
        </div>
        <div className="relative mt-3">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="mt-1.5 text-sm font-semibold tracking-tight">{label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
        </div>
      </div>
    </Link>
  );
}

