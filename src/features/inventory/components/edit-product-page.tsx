"use client";

import { useQuery } from "@tanstack/react-query";
import { ProductForm } from "@/features/inventory/components/product-form";
import { getProduct } from "@/features/inventory/services/inventory.service";
import { ErrorState } from "@/components/feedback/states";
import { TableSkeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/query/query-keys";

export function EditProductPage({ id }: { id: string }) {
  const product = useQuery({ queryKey: queryKeys.products.detail(id), queryFn: () => getProduct(id) });
  if (product.isLoading) return <TableSkeleton />;
  if (product.isError || !product.data) return <ErrorState onRetry={() => void product.refetch()} />;
  return <ProductForm product={product.data} />;
}
