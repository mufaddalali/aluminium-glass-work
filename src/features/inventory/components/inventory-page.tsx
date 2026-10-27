"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { type AppColumn } from "@/components/data/data-table";
import { Package, Plus } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/data/data-table";
import { RowActions } from "@/components/data/row-actions";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageHeader, Pagination } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { listProducts } from "@/features/inventory/services/inventory.service";
import { formatMoney, formatQuantity } from "@/lib/format";
import { useDebounced } from "@/lib/use-debounced";
import { queryKeys } from "@/query/query-keys";
import type { ProductDto } from "@/lib/types";

export function InventoryPage() {
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const products = useQuery({
    queryKey: queryKeys.products.list({ debounced, stock, page }),
    queryFn: () => listProducts({ search: debounced, stock, page, pageSize: 20 }),
  });

  const columns: AppColumn<ProductDto>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <Link className="font-medium hover:underline" href={`/inventory/${row.original.id}`}>{row.original.name}</Link> },
    { accessorKey: "stockQuantity", header: "Quantity", cell: ({ row }) => formatQuantity(row.original.stockQuantity) },
    { accessorKey: "defaultSellingPrice", header: "Default selling price", cell: ({ row }) => formatMoney(row.original.defaultSellingPrice) },
    { accessorKey: "description", header: "Description", cell: ({ row }) => row.original.description || "—" },
    { header: "Actions", cell: ({ row }) => <RowActions viewHref={`/inventory/${row.original.id}`} editHref={`/inventory/${row.original.id}/edit`} /> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Inventory" description="Products kept in the shop." actions={<Button asChild><Link href="/inventory/new"><Plus className="h-4 w-4" />Add product</Link></Button>} />
      <div className="grid gap-2 md:grid-cols-2">
        <SearchSelect ariaLabel="Search products" placeholder="Search name or description" value={search} onChange={(value) => { setSearch(value); setPage(1); }} loading={search !== debounced || products.isFetching} />
        <select className="control-glass h-11 rounded-2xl px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" aria-label="Stock" value={stock} onChange={(event) => { setStock(event.target.value); setPage(1); }}>
          <option value="">All quantities</option>
          <option value="out">Out of stock</option>
        </select>
      </div>
      {products.isLoading ? <TableSkeleton /> : null}
      {products.isError ? <ErrorState onRetry={() => void products.refetch()} /> : null}
      {products.data && products.data.items.length === 0 ? <EmptyState icon={Package} title="No products yet" description="Add a product with a name, quantity, selling price, and description." action={<Button asChild><Link href="/inventory/new">Add product</Link></Button>} /> : null}
      {products.data && products.data.items.length > 0 ? (
        <div className="space-y-4">
          <DataTable columns={columns} data={products.data.items} />
          <Pagination page={products.data.meta.page} pageCount={products.data.meta.pageCount} onPage={setPage} />
        </div>
      ) : null}
    </div>
  );
}
