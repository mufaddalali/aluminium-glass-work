"use client";

import { useQuery } from "@tanstack/react-query";
import { type AppColumn } from "@/components/data/data-table";
import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DataTable } from "@/components/data/data-table";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageHeader, Pagination } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { getShopSettings, listMovements, movementsExportUrl } from "@/features/inventory/services/inventory.service";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { UNIT_LABELS } from "@/lib/glass";
import { useDebounced } from "@/lib/use-debounced";
import { queryKeys } from "@/query/query-keys";
import type { MovementDto } from "@/lib/types";

export function MovementsPage() {
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const settings = useQuery({ queryKey: queryKeys.settings.current, queryFn: getShopSettings });
  const movements = useQuery({
    queryKey: queryKeys.movements.list({ debounced, direction, from, to, page }),
    queryFn: () => listMovements({ search: debounced, direction, from, to, page, pageSize: 20 }),
  });
  const timeZone = settings.data?.timeZone ?? "Asia/Karachi";
  const columns: AppColumn<MovementDto>[] = [
    { header: "When", cell: ({ row }) => formatDateTime(row.original.occurredAt, timeZone) },
    { header: "Product", cell: ({ row }) => row.original.productName },
    { header: "Direction", cell: ({ row }) => <StatusBadge status={row.original.direction} /> },
    { header: "Quantity", cell: ({ row }) => `${formatQuantity(row.original.quantity)} ${UNIT_LABELS[row.original.unit]}` },
    { header: "Before", cell: ({ row }) => row.original.stockBefore ? formatQuantity(row.original.stockBefore) : "—" },
    { header: "After", cell: ({ row }) => row.original.stockAfter ? formatQuantity(row.original.stockAfter) : "—" },
    { header: "Reason", cell: ({ row }) => row.original.reason },
    { header: "Invoice", cell: ({ row }) => row.original.referenceId ? <Link className="hover:underline" href={`/invoices/${row.original.referenceId}`}>{row.original.invoiceNumber ?? "Invoice"}</Link> : "—" },
    { header: "User", cell: ({ row }) => row.original.createdByName },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Stock movements" description="An append-only record of every quantity change." actions={<Button variant="outline" asChild><a href={movementsExportUrl({ search: debounced, direction, from, to })}>Export CSV</a></Button>} />
      <div className="surface-card grid gap-3 p-4 md:grid-cols-4">
        <Input aria-label="Search movements" placeholder="Product or reason" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <select aria-label="Direction" className="h-10 rounded-md border border-input bg-card px-3 text-sm" value={direction} onChange={(event) => { setDirection(event.target.value); setPage(1); }}>
          <option value="">In and out</option>
          <option value="IN">In</option>
          <option value="OUT">Out</option>
        </select>
        <Input aria-label="From" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
        <Input aria-label="To" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
      </div>
      {movements.isLoading ? <TableSkeleton /> : null}
      {movements.isError ? <ErrorState onRetry={() => void movements.refetch()} /> : null}
      {movements.data?.items.length === 0 ? <EmptyState icon={ArrowLeftRight} title="No movements" description="Receiving stock or issuing an invoice creates the first ledger row." /> : null}
      {movements.data && movements.data.items.length > 0 ? <div className="space-y-4"><DataTable columns={columns} data={movements.data.items} /><Pagination page={movements.data.meta.page} pageCount={movements.data.meta.pageCount} onPage={setPage} /></div> : null}
    </div>
  );
}
