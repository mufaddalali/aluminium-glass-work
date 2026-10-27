"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { productSchema } from "@/features/inventory/schemas/product.schema";
import { saveProduct } from "@/features/inventory/services/inventory.service";
import { getErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/query/query-keys";
import type { ProductDto } from "@/lib/types";
import type { z } from "zod";

type FormInput = z.input<typeof productSchema>;
type Values = z.output<typeof productSchema>;

export function ProductForm({ product }: { product?: ProductDto }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      quantity: product?.stockQuantity ?? "0",
      defaultSellingPrice: product?.defaultSellingPrice ?? "0",
      description: product?.description ?? "",
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
      <PageHeader title={product ? "Edit product" : "New product"} description="Quantity on hand changes here, and again when an issued invoice uses shop stock." />
      <div className="surface-card grid gap-4 p-5 md:grid-cols-2">
        <Field label="Name" htmlFor="name" error={form.formState.errors.name?.message}><Input id="name" {...form.register("name")} /></Field>
        <Field label="Quantity" htmlFor="quantity" error={form.formState.errors.quantity?.message}><Input id="quantity" inputMode="decimal" {...form.register("quantity")} /></Field>
        <Field label="Default selling price" htmlFor="defaultSellingPrice" error={form.formState.errors.defaultSellingPrice?.message}><Input id="defaultSellingPrice" inputMode="decimal" {...form.register("defaultSellingPrice")} /></Field>
        <div className="md:col-span-2"><Field label="Description" htmlFor="description" error={form.formState.errors.description?.message}><Textarea id="description" {...form.register("description")} /></Field></div>
      </div>
      <Button type="submit" loading={mutation.isPending}>Save product</Button>
    </form>
  );
}
