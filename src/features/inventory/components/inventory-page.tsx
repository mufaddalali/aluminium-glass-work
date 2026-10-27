"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { type AppColumn } from "@/components/data/data-table";
import { Package, Plus } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/data/data-table";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageHeader, Pagination } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { listProducts, listCategories } from "@/features/inventory/services/inventory.service";
import { formatMoney, formatQuantity } from "@/lib/format";
import { UNIT_LABELS } from "@/lib/glass";
import { useDebounced } from "@/lib/use-debounced";
import { queryKeys } from "@/query/query-keys";
import type { ProductDto } from "@/lib/types";

export function InventoryPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stock, setStock] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const categories = useQuery({ queryKey: queryKeys.categories.all, queryFn: listCategories });
  const products = useQuery({
    queryKey: queryKeys.products.list({ debounced, categoryId, stock, page }),
    queryFn: () => listProducts({ search: debounced, categoryId, stock, page, pageSize: 20 }),
  });

  const columns: AppColumn<ProductDto>[] = [
    { accessorKey: "name", header: "Product", cell: ({ row }) => <Link className="font-medium hover:underline" href={`/inventory/${row.original.id}`}>{row.original.name}</Link> },
    { accessorKey: "sku", header: "SKU", cell: ({ row }) => row.original.sku || "—" },
    { accessorKey: "categoryName", header: "Category" },
    { accessorKey: "inventoryUnit", header: "Unit", cell: ({ row }) => UNIT_LABELS[row.original.inventoryUnit] },
    { accessorKey: "stockQuantity", header: "Stock", cell: ({ row }) => formatQuantity(row.original.stockQuantity) },
    { accessorKey: "minimumStockLevel", header: "Minimum", cell: ({ row }) => formatQuantity(row.original.minimumStockLevel) },
    { accessorKey: "defaultCostPrice", header: "Cost", cell: ({ row }) => row.original.defaultCostPrice ? formatMoney(row.original.defaultCostPrice) : "—" },
    { accessorKey: "defaultSellingPrice", header: "Price", cell: ({ row }) => formatMoney(row.original.defaultSellingPrice) },
    { accessorKey: "stockStatus", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.isActive ? row.original.stockStatus : "ARCHIVED"} /> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Inventory" description="Products kept in the shop, with quantities maintained only through stock movements." actions={<Button asChild><Link href="/inventory/new"><Plus className="h-4 w-4" />Add product</Link></Button>} />
      <div className="surface-card grid gap-3 p-4 md:grid-cols-4">
        <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, SKU, or brand" aria-label="Search products" />
        <select className="h-10 rounded-md border border-input bg-card px-3 text-sm" aria-label="Category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select className="h-10 rounded-md border border-input bg-card px-3 text-sm" aria-label="Stock status" value={stock} onChange={(event) => { setStock(event.target.value); setPage(1); }}>
          <option value="">All stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>
      {products.isLoading ? <TableSkeleton /> : null}
      {products.isError ? <ErrorState onRetry={() => void products.refetch()} /> : null}
      {products.data && products.data.items.length === 0 ? <EmptyState icon={Package} title="No products yet" description="Add a product, then receive stock when material arrives." action={<Button asChild><Link href="/inventory/new">Add product</Link></Button>} /> : null}
      {products.data && products.data.items.length > 0 ? (
        <div className="space-y-4">
          <DataTable columns={columns} data={products.data.items} />
          <Pagination page={products.data.meta.page} pageCount={products.data.meta.pageCount} onPage={setPage} />
        </div>
      ) : null}
    </div>
  );
}
