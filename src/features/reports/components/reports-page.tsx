"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState } from "@/components/feedback/states";
import { PageHeader, Pagination } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { Table, TableWrap, THead, Th, Td, Tr } from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { getReport } from "@/features/reports/services/report.service";
import { useDebounced } from "@/lib/use-debounced";
import { queryKeys } from "@/query/query-keys";

const reports = [
  ["sales", "Sales"],
  ["invoices", "Issued invoices"],
  ["outstanding", "Outstanding"],
  ["customers", "Customer balances"],
  ["stock", "Stock on hand"],
  ["movements", "Movements"],
  ["payments", "Payments"],
  ["outside", "Outside purchases"],
] as const;

export function ReportsPage() {
  const [type, setType] = useState<(typeof reports)[number][0]>("sales");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const report = useQuery({
    queryKey: queryKeys.reports.list(type, { debounced, from, to, page }),
    queryFn: () => getReport(type, { search: debounced, from, to, page, pageSize: 20 }),
  });
  const exportHref = `/api/reports/${type}?${new URLSearchParams({ search: debounced, from, to, export: "csv" }).toString()}`;
  return (
    <div className="space-y-8">
      <PageHeader title="Reports" description="Sales figures exclude drafts and void invoices. Outside-purchase margin is an estimate, not accounting profit." actions={<Button variant="outline" asChild><a href={exportHref}>Export CSV</a></Button>} />
      <div className="flex flex-wrap gap-2">
        {reports.map(([value, label]) => <Button key={value} variant={type === value ? "primary" : "outline"} onClick={() => { setType(value); setPage(1); }}>{label}</Button>)}
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <SearchSelect ariaLabel="Search report" placeholder="Search" value={search} onChange={(value) => { setSearch(value); setPage(1); }} loading={search !== debounced || report.isFetching} />
        <Input aria-label="From" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
        <Input aria-label="To" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
      </div>
      {report.isLoading ? <TableSkeleton /> : null}
      {report.isError ? <ErrorState onRetry={() => void report.refetch()} /> : null}
      {report.data ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{report.data.description}</p>
          <TableWrap>
            <Table>
              <THead><tr>{report.data.columns.map((column) => <Th key={column.key}>{column.label}</Th>)}</tr></THead>
              <tbody>
                {report.data.rows.map((row, index) => <Tr key={index}>{report.data.columns.map((column) => <Td key={column.key}>{row[column.key]}</Td>)}</Tr>)}
              </tbody>
            </Table>
          </TableWrap>
          <Pagination page={report.data.meta.page} pageCount={report.data.meta.pageCount} onPage={setPage} />
        </div>
      ) : null}
    </div>
  );
}
