"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { productSchema } from "@/features/inventory/schemas/product.schema";
import { listCategories, saveProduct } from "@/features/inventory/services/inventory.service";
import { getErrorMessage } from "@/lib/axios";
import { UNIT_LABELS, INVENTORY_UNITS } from "@/lib/glass";
import { queryKeys } from "@/query/query-keys";
import type { ProductDto } from "@/lib/types";
import type { z } from "zod";

type FormInput = z.input<typeof productSchema>;
type Values = z.output<typeof productSchema>;

export function ProductForm({ product }: { product?: ProductDto }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: queryKeys.categories.all, queryFn: listCategories });
  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      categoryId: product?.categoryId ?? "",
      description: product?.description ?? "",
      brand: product?.brand ?? "",
      colour: product?.colour ?? "",
      thickness: product?.thickness ?? "",
      inventoryUnit: product?.inventoryUnit ?? "SQ_FT",
      minimumStockLevel: product?.minimumStockLevel ?? "0",
      defaultCostPrice: product?.defaultCostPrice ?? "",
      defaultSellingPrice: product?.defaultSellingPrice ?? "0",
      openingQuantity: "",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: Values) => saveProduct(product?.id ?? null, values),
    onSuccess: async (saved) => {
      toast.success(product ? "Product updated." : "Product created.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      router.push(`/inventory/${saved.id}`);
    },
    onError: (error) => toast.error(getErrorMessage(error, "The product could not be saved.")),
  });

  return (
    <form className="space-y-8" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <PageHeader title={product ? "Edit product" : "New product"} description="Stock quantity changes only when you receive material or record an adjustment." />
      <div className="surface-card grid gap-4 p-5 md:grid-cols-2">
        <Field label="Name" htmlFor="name" error={form.formState.errors.name?.message}><Input id="name" {...form.register("name")} /></Field>
        <Field label="SKU" htmlFor="sku" error={form.formState.errors.sku?.message}><Input id="sku" {...form.register("sku")} /></Field>
        <Field label="Category" htmlFor="categoryId" error={form.formState.errors.categoryId?.message}>
          <select id="categoryId" className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register("categoryId")}>
            <option value="">Choose</option>
            {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </Field>
        <Field label="Unit" htmlFor="inventoryUnit" error={form.formState.errors.inventoryUnit?.message}>
          <select id="inventoryUnit" className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register("inventoryUnit")}>
            {INVENTORY_UNITS.map((unit) => <option key={unit} value={unit}>{UNIT_LABELS[unit]}</option>)}
          </select>
        </Field>
        <Field label="Brand" htmlFor="brand"><Input id="brand" {...form.register("brand")} /></Field>
        <Field label="Colour" htmlFor="colour"><Input id="colour" {...form.register("colour")} /></Field>
        <Field label="Thickness" htmlFor="thickness"><Input id="thickness" {...form.register("thickness")} /></Field>
        <Field label="Minimum stock" htmlFor="minimumStockLevel" error={form.formState.errors.minimumStockLevel?.message}><Input id="minimumStockLevel" inputMode="decimal" {...form.register("minimumStockLevel")} /></Field>
        <Field label="Default cost" htmlFor="defaultCostPrice"><Input id="defaultCostPrice" inputMode="decimal" {...form.register("defaultCostPrice")} /></Field>
        <Field label="Default selling price" htmlFor="defaultSellingPrice" error={form.formState.errors.defaultSellingPrice?.message}><Input id="defaultSellingPrice" inputMode="decimal" {...form.register("defaultSellingPrice")} /></Field>
        {product ? null : <Field label="Opening quantity" htmlFor="openingQuantity"><Input id="openingQuantity" inputMode="decimal" {...form.register("openingQuantity")} /></Field>}
        <div className="md:col-span-2"><Field label="Description" htmlFor="description"><Textarea id="description" {...form.register("description")} /></Field></div>
      </div>
      <Button type="submit" loading={mutation.isPending}>Save product</Button>
    </form>
  );
}
