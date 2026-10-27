"use client";

import { useQuery } from "@tanstack/react-query";
import { type AppColumn } from "@/components/data/data-table";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DataTable } from "@/components/data/data-table";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageHeader, Pagination } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RowActions } from "@/components/data/row-actions";
import { SearchSelect } from "@/components/ui/search-select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { listInvoices } from "@/features/invoices/services/invoice.service";
import { formatDateOnly, formatMoney } from "@/lib/format";
import { useDebounced } from "@/lib/use-debounced";
import { queryKeys } from "@/query/query-keys";
import type { InvoiceListItem } from "@/lib/types";

export function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const invoices = useQuery({
    queryKey: queryKeys.invoices.list({ debounced, status, from, to, page }),
    queryFn: () => listInvoices({ search: debounced, status, from, to, page, pageSize: 20 }),
  });
  const columns: AppColumn<InvoiceListItem>[] = [
    { header: "Invoice", cell: ({ row }) => <Link className="font-medium hover:underline" href={`/invoices/${row.original.id}`}>{row.original.invoiceNumber ?? "Draft"}</Link> },
    { header: "Customer", cell: ({ row }) => row.original.customerName },
    { header: "Date", cell: ({ row }) => formatDateOnly(row.original.invoiceDate) },
    { header: "Total", cell: ({ row }) => formatMoney(row.original.totalAmount, "") },
    { header: "Paid", cell: ({ row }) => formatMoney(row.original.amountPaid, "") },
    { header: "Outstanding", cell: ({ row }) => formatMoney(row.original.outstanding, "") },
    { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { header: "Actions", cell: ({ row }) => <RowActions viewHref={`/invoices/${row.original.id}`} editHref={row.original.status === "DRAFT" ? `/invoices/${row.original.id}/edit` : undefined} /> },
  ];
  return (
    <div className="space-y-8">
      <PageHeader title="Invoices" description="Drafts do not change stock or customer debt. Issued invoices do." actions={<Button asChild><Link href="/invoices/new"><Plus className="h-4 w-4" />New invoice</Link></Button>} />
      <div className="grid gap-2 md:grid-cols-4">
        <SearchSelect ariaLabel="Search invoices" placeholder="Number, customer, or phone" value={search} onChange={(value) => { setSearch(value); setPage(1); }} loading={search !== debounced || invoices.isFetching} />
        <select aria-label="Status" className="control-glass h-11 rounded-2xl px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "VOID"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select>
        <Input aria-label="From date" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
        <Input aria-label="To date" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
      </div>
      {invoices.isLoading ? <TableSkeleton /> : null}
      {invoices.isError ? <ErrorState onRetry={() => void invoices.refetch()} /> : null}
      {invoices.data?.items.length === 0 ? <EmptyState icon={FileText} title="No invoices" description="Create a draft, then issue it when the customer confirms." action={<Button asChild><Link href="/invoices/new">New invoice</Link></Button>} /> : null}
      {invoices.data && invoices.data.items.length > 0 ? <div className="space-y-4"><DataTable columns={columns} data={invoices.data.items} /><Pagination page={invoices.data.meta.page} pageCount={invoices.data.meta.pageCount} onPage={setPage} /></div> : null}
    </div>
  );
}
