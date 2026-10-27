"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ErrorState } from "@/components/feedback/states";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { archiveProduct, getProduct, getShopSettings, listMovements, receiveStock, removeStock } from "@/features/inventory/services/inventory.service";
import { getErrorMessage } from "@/lib/axios";
import { formatDateTime, formatMoney, formatQuantity } from "@/lib/format";
import { UNIT_LABELS } from "@/lib/glass";
import { todayInput } from "@/lib/use-debounced";
import { queryKeys } from "@/query/query-keys";

export function ProductDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const product = useQuery({ queryKey: queryKeys.products.detail(id), queryFn: () => getProduct(id) });
  const movements = useQuery({ queryKey: queryKeys.movements.list({ productId: id }), queryFn: () => listMovements({ productId: id, page: 1, pageSize: 8 }) });
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const settingsQuery = useQuery({ queryKey: queryKeys.settings.current, queryFn: getShopSettings });

  const archive = useMutation({
    mutationFn: () => archiveProduct(id),
    onSuccess: async () => {
      toast.success("Product archived.");
      setArchiveOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, "The product could not be archived.")),
  });

  if (product.isLoading) return <TableSkeleton />;
  if (product.isError || !product.data) return <ErrorState onRetry={() => void product.refetch()} />;
  const item = product.data;
  const timeZone = settingsQuery.data?.timeZone ?? "Asia/Karachi";

  return (
    <div className="space-y-8">
      <PageHeader title={item.name} description={item.categoryName} actions={
        <>
          <Button variant="outline" asChild><Link href={`/inventory/${id}/edit`}>Edit</Link></Button>
          <Button onClick={() => setReceiveOpen(true)}>Add stock</Button>
          <Button variant="outline" onClick={() => setRemoveOpen(true)}>Remove stock</Button>
          {item.isActive ? <Button variant="destructive" onClick={() => setArchiveOpen(true)}>Archive</Button> : null}
        </>
      } />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="On hand" value={`${formatQuantity(item.stockQuantity)} ${UNIT_LABELS[item.inventoryUnit]}`} />
        <Metric label="Minimum" value={formatQuantity(item.minimumStockLevel)} />
        <Metric label="Selling price" value={formatMoney(item.defaultSellingPrice)} />
        <Metric label="Status" value={<StatusBadge status={item.isActive ? item.stockStatus : "ARCHIVED"} />} />
      </div>
      <section className="surface-card p-5">
        <h2 className="text-lg font-semibold">Recent movements</h2>
        <div className="mt-4 space-y-3">
          {movements.data?.items.map((movement) => (
            <div key={movement.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
              <div>
                <p className="font-medium">{movement.direction} · {formatQuantity(movement.quantity)} {UNIT_LABELS[movement.unit]}</p>
                <p className="text-muted-foreground">{movement.reason}</p>
              </div>
              <p className="text-muted-foreground">{formatDateTime(movement.occurredAt, timeZone)}</p>
            </div>
          ))}
          {movements.data?.items.length === 0 ? <p className="text-sm text-muted-foreground">No stock movements yet.</p> : null}
        </div>
      </section>
      <StockDialog open={receiveOpen} onOpenChange={setReceiveOpen} title="Add stock" productId={id} mode="in" />
      <StockDialog open={removeOpen} onOpenChange={setRemoveOpen} title="Remove stock" productId={id} mode="out" />
      <ConfirmDialog open={archiveOpen} onOpenChange={setArchiveOpen} title="Archive this product?" description="Archived products stay on old invoices but cannot be sold from stock." confirmLabel="Archive" destructive loading={archive.isPending} onConfirm={() => archive.mutate()} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="surface-card p-5"><p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</p><div className="mt-2 text-2xl font-semibold">{value}</div></div>;
}

function StockDialog({ open, onOpenChange, title, productId, mode }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; productId: string; mode: "in" | "out" }) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayInput());
  const [reason, setReason] = useState("");
  const [movementType, setMovementType] = useState(mode === "in" ? "RECEIPT" : "MANUAL_REMOVE");
  const [supplierName, setSupplierName] = useState("");
  const [supplierReference, setSupplierReference] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [confirm, setConfirm] = useState(false);
  const mutation = useMutation({
    mutationFn: () => mode === "in"
      ? receiveStock({ productId, quantity, occurredAt, reason, movementType, supplierName, supplierReference, costPrice })
      : removeStock({ productId, quantity, occurredAt, reason, movementType }),
    onSuccess: async () => {
      toast.success(mode === "in" ? "Stock added." : "Stock removed.");
      setConfirm(false);
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.movements.all });
    },
    onError: (error) => toast.error(getErrorMessage(error, "The stock change was not saved.")),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent title={title} description="This writes a stock movement and updates the balance together.">
          <div className="space-y-4">
            <Field label="Quantity" htmlFor="stock-qty"><Input id="stock-qty" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></Field>
            <Field label="Date" htmlFor="stock-date"><Input id="stock-date" type="date" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} /></Field>
            <Field label="Reason type" htmlFor="stock-type">
              <select id="stock-type" className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" value={movementType} onChange={(event) => setMovementType(event.target.value)}>
                {mode === "in" ? <><option value="RECEIPT">Stock received</option><option value="INITIAL">Opening stock</option><option value="MANUAL_ADD">Manual addition</option><option value="CORRECTION">Correction</option><option value="CUSTOMER_RETURN">Customer return</option></> : <><option value="MANUAL_REMOVE">Damage, use, or removal</option><option value="CORRECTION">Correction</option></>}
              </select>
            </Field>
            {mode === "in" ? (
              <>
                <Field label="Cost price" htmlFor="cost"><Input id="cost" inputMode="decimal" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} /></Field>
                <Field label="Supplier" htmlFor="supplier"><Input id="supplier" value={supplierName} onChange={(event) => setSupplierName(event.target.value)} /></Field>
                <Field label="Supplier reference" htmlFor="supplier-ref"><Input id="supplier-ref" value={supplierReference} onChange={(event) => setSupplierReference(event.target.value)} /></Field>
              </>
            ) : null}
            <Field label="Notes" htmlFor="stock-reason"><Textarea id="stock-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => setConfirm(true)}>{mode === "in" ? "Add stock" : "Remove stock"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={mode === "in" ? "Add this stock?" : "Remove this stock?"} description="The quantity and the stock ledger are updated together. A removal that exceeds the balance is rejected." confirmLabel="Apply" destructive={mode === "out"} loading={mutation.isPending} onConfirm={() => mutation.mutate()} />
    </>
  );
}
