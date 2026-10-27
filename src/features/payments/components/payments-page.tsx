"use client";

import { useQuery } from "@tanstack/react-query";
import { type AppColumn } from "@/components/data/data-table";
import Link from "next/link";
import { useState } from "react";
import { DataTable } from "@/components/data/data-table";
import { ErrorState } from "@/components/feedback/states";
import { PageHeader, Pagination } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { RowActions } from "@/components/data/row-actions";
import { SearchSelect } from "@/components/ui/search-select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { listPayments } from "@/features/invoices/services/invoice.service";
import { formatDateOnly, formatMoney } from "@/lib/format";
import { useDebounced } from "@/lib/use-debounced";
import { queryKeys } from "@/query/query-keys";
import type { PaymentDto } from "@/lib/types";

export function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const payments = useQuery({
    queryKey: queryKeys.payments.list({ debounced, from, to, page }),
    queryFn: () => listPayments({ search: debounced, from, to, page, pageSize: 20 }),
  });
  const columns: AppColumn<PaymentDto>[] = [
    { header: "Date", cell: ({ row }) => formatDateOnly(row.original.paymentDate) },
    { header: "Invoice", cell: ({ row }) => <Link className="hover:underline" href={`/invoices/${row.original.invoiceId}`}>{row.original.invoiceNumber ?? "Invoice"}</Link> },
    { header: "Customer", cell: ({ row }) => row.original.customerName },
    { header: "Kind", cell: ({ row }) => row.original.kind },
    { header: "Method", cell: ({ row }) => row.original.paymentMethod.replaceAll("_", " ") },
    { header: "Amount", cell: ({ row }) => formatMoney(row.original.amount) },
    { header: "Reference", cell: ({ row }) => row.original.reference || "—" },
    { header: "Actions", cell: ({ row }) => <RowActions viewHref={`/invoices/${row.original.invoiceId}`} /> },
  ];
  return (
    <div className="space-y-8">
      <PageHeader title="Payments" description="Record a receipt from the invoice. Partial payments leave the remaining balance outstanding." />
      <div className="grid gap-2 md:grid-cols-3">
        <SearchSelect ariaLabel="Search payments" placeholder="Customer, invoice, or reference" value={search} onChange={(value) => { setSearch(value); setPage(1); }} loading={search !== debounced || payments.isFetching} />
        <Input aria-label="From" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
        <Input aria-label="To" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
      </div>
      {payments.isLoading ? <TableSkeleton /> : null}
      {payments.isError ? <ErrorState onRetry={() => void payments.refetch()} /> : null}
      {payments.data ? <div className="space-y-4"><DataTable columns={columns} data={payments.data.items} /><Pagination page={payments.data.meta.page} pageCount={payments.data.meta.pageCount} onPage={setPage} /></div> : null}
    </div>
  );
}
