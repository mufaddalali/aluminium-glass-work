"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { InvoiceSourcePicker } from "@/features/invoices/components/invoice-source-picker";
import { createCustomerInline, getInvoiceSettings, issueInvoice, saveInvoice, searchCustomers, searchProducts } from "@/features/invoices/services/invoice.service";
import { getErrorMessage } from "@/lib/axios";
import { formatMoney, formatQuantity } from "@/lib/format";
import { computeBilledQuantity, DIMENSION_UNITS, isAreaUnit, UNIT_LABELS, type InventoryUnit } from "@/lib/glass";
import { computeInvoiceTotals, computeLineTotal } from "@/lib/invoice-math";
import { d } from "@/lib/money";
import { todayInput, useDebounced } from "@/lib/use-debounced";
import { queryKeys } from "@/query/query-keys";
import type { InvoiceDto } from "@/lib/types";

type Line = {
  key: string;
  productId: string;
  itemName: string;
  description: string;
  sourceType: "STOCK" | "OUTSIDE_PURCHASE";
  quantity: string;
  unit: InventoryUnit;
  width: string;
  height: string;
  dimensionUnit: "MM" | "CM" | "IN" | "FT" | "M";
  pieceCount: string;
  unitPrice: string;
  discountAmount: string;
  purchaseCost: string;
  supplierName: string;
  supplierReference: string;
  purchaseNotes: string;
  available: string | null;
};

function blankLine(): Line {
  return { key: crypto.randomUUID(), productId: "", itemName: "", description: "", sourceType: "STOCK", quantity: "1", unit: "SQ_FT", width: "", height: "", dimensionUnit: "IN", pieceCount: "1", unitPrice: "0", discountAmount: "0", purchaseCost: "", supplierName: "", supplierReference: "", purchaseNotes: "", available: null };
}

function fromInvoice(invoice: InvoiceDto): Line[] {
  return invoice.lines.map((line) => ({
    key: line.id,
    productId: line.productId ?? "",
    itemName: line.itemName,
    description: line.description ?? "",
    sourceType: line.sourceType,
    quantity: line.quantity,
    unit: line.unit,
    width: line.width ?? "",
    height: line.height ?? "",
    dimensionUnit: (line.dimensionUnit as Line["dimensionUnit"]) || "IN",
    pieceCount: line.pieceCount?.toString() ?? "",
    unitPrice: line.unitPrice,
    discountAmount: line.discountAmount,
    purchaseCost: line.purchaseCost ?? "",
    supplierName: line.supplierName ?? "",
    supplierReference: line.supplierReference ?? "",
    purchaseNotes: line.purchaseNotes ?? "",
    available: null,
  }));
}

export function InvoiceEditor({ invoice }: { invoice?: InvoiceDto }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: queryKeys.settings.current, queryFn: getInvoiceSettings });
  const [customerId, setCustomerId] = useState(invoice?.customerId ?? "");
  const [customerLabel, setCustomerLabel] = useState(invoice ? `${invoice.customerName} · ${invoice.customerPhone}` : "");
  const [customerSearch, setCustomerSearch] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(invoice ? invoice.invoiceDate.slice(0, 10) : todayInput());
  const [dueDate, setDueDate] = useState(invoice?.dueDate?.slice(0, 10) ?? "");
  const [discountAmount, setDiscountAmount] = useState(invoice?.discountAmount ?? "0");
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [terms, setTerms] = useState(invoice?.terms ?? "");
  const [lines, setLines] = useState<Line[]>(invoice ? fromInvoice(invoice) : [blankLine()]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const debouncedCustomer = useDebounced(customerSearch);
  const customers = useQuery({ queryKey: queryKeys.customers.list({ debouncedCustomer, picker: true }), queryFn: () => searchCustomers(debouncedCustomer), enabled: debouncedCustomer.length > 0 });

  const preview = useMemo(() => previewTotals(lines, discountAmount, settings.data?.taxEnabled ?? false, settings.data?.taxRate ?? "0"), [lines, discountAmount, settings.data]);

  const save = useMutation({
    mutationFn: async (issue: boolean) => {
      const saved = await saveInvoice(invoice?.id ?? null, payload(customerId, invoiceDate, dueDate, discountAmount, notes, terms, lines));
      if (!issue) return saved;
      try {
        return await issueInvoice(saved.id);
      } catch (error) {
        router.push(`/invoices/${saved.id}`);
        throw error;
      }
    },
    onSuccess: async (saved) => {
      toast.success(saved.status === "DRAFT" ? "Draft saved." : "Invoice issued.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      router.push(`/invoices/${saved.id}`);
    },
    onError: (error) => toast.error(getErrorMessage(error, "The invoice could not be saved.")),
  });

  return (
    <div className="space-y-8">
      <PageHeader title={invoice ? invoice.invoiceNumber ?? "Edit draft" : "New invoice"} description="Choose the source of every line. Shop stock is deducted only when you issue the invoice." />
      <section className="surface-card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Field label="Customer" htmlFor="customer-search"><Input id="customer-search" value={customerSearch} placeholder={customerLabel || "Search name or phone"} onChange={(event) => setCustomerSearch(event.target.value)} /></Field>
          <Button type="button" variant="outline" onClick={() => setCustomerOpen(true)}>Add customer</Button>
        </div>
        {customerLabel ? <p className="text-sm">Selected: {customerLabel}</p> : null}
        <div className="space-y-1">
          {customers.data?.items.map((customer) => (
            <button type="button" key={customer.id} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setCustomerId(customer.id); setCustomerLabel(`${customer.name} · ${customer.phone}`); setCustomerSearch(""); }}>
              {customer.name} · {customer.phone}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Invoice date" htmlFor="invoice-date"><Input id="invoice-date" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></Field>
          <Field label="Due date" htmlFor="due-date"><Input id="due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></Field>
          <Field label="Invoice discount" htmlFor="discount"><Input id="discount" inputMode="decimal" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} /></Field>
        </div>
      </section>
      <div className="space-y-4">
        {lines.map((line, index) => (
          <LineEditor key={line.key} line={line} onChange={(next) => setLines((current) => current.map((item) => item.key === line.key ? next : item))} onRemove={() => setLines((current) => current.filter((item) => item.key !== line.key))} index={index} />
        ))}
        <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, blankLine()])}>Add line</Button>
      </div>
      <section className="surface-card space-y-2 p-5 text-sm">
        <Total label="Subtotal" value={preview.subtotal} currency={settings.data?.currency} />
        <Total label="Discount" value={preview.discount} currency={settings.data?.currency} />
        {settings.data?.taxEnabled ? <Total label={settings.data.taxLabel} value={preview.tax} currency={settings.data.currency} /> : null}
        <Total label="Total" value={preview.total} currency={settings.data?.currency} strong />
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Notes" htmlFor="notes"><Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
        <Field label="Terms" htmlFor="terms"><Textarea id="terms" value={terms} onChange={(event) => setTerms(event.target.value)} /></Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" loading={save.isPending} onClick={() => save.mutate(false)}>Save draft</Button>
        <Button loading={save.isPending} onClick={() => save.mutate(true)}>Issue invoice</Button>
      </div>
      <NewCustomerDialog open={customerOpen} onOpenChange={setCustomerOpen} onCreated={(customer) => { setCustomerId(customer.id); setCustomerLabel(`${customer.name} · ${customer.phone}`); }} />
    </div>
  );
}

function LineEditor({ line, onChange, onRemove, index }: { line: Line; onChange: (line: Line) => void; onRemove: () => void; index: number }) {
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const products = useQuery({ queryKey: queryKeys.products.list({ debounced, picker: index }), queryFn: () => searchProducts(debounced), enabled: debounced.length > 0 });
  const billed = billedQuantity(line);
  const short = line.sourceType === "STOCK" && line.available != null && billed != null && d(billed).gt(line.available);
  return (
    <section className="surface-card space-y-4 p-5">
      <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Line {index + 1}</h2><Button type="button" variant="ghost" onClick={onRemove}>Remove</Button></div>
      <InvoiceSourcePicker source={line.sourceType} onChange={(sourceType) => onChange({ ...line, sourceType })} />
      <Field label="Product" htmlFor={`product-${line.key}`}><Input id={`product-${line.key}`} value={search} placeholder={line.itemName || "Search catalog or type a custom name below"} onChange={(event) => setSearch(event.target.value)} /></Field>
      <div className="space-y-1">
        {products.data?.items.map((product) => (
          <button type="button" key={product.id} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { onChange({ ...line, productId: product.id, itemName: product.name, unit: product.inventoryUnit, unitPrice: product.defaultSellingPrice, available: product.stockQuantity }); setSearch(""); }}>
            {product.name} · {formatQuantity(product.stockQuantity)} {UNIT_LABELS[product.inventoryUnit]} available
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Item name" htmlFor={`name-${line.key}`}><Input id={`name-${line.key}`} value={line.itemName} onChange={(event) => onChange({ ...line, itemName: event.target.value })} /></Field>
        <Field label="Unit price" htmlFor={`price-${line.key}`}><Input id={`price-${line.key}`} inputMode="decimal" value={line.unitPrice} onChange={(event) => onChange({ ...line, unitPrice: event.target.value })} /></Field>
        <Field label="Quantity" htmlFor={`qty-${line.key}`}><Input id={`qty-${line.key}`} inputMode="decimal" value={line.quantity} onChange={(event) => onChange({ ...line, quantity: event.target.value })} /></Field>
        <Field label="Line discount" htmlFor={`disc-${line.key}`}><Input id={`disc-${line.key}`} inputMode="decimal" value={line.discountAmount} onChange={(event) => onChange({ ...line, discountAmount: event.target.value })} /></Field>
      </div>
      {isAreaUnit(line.unit) ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Width" htmlFor={`w-${line.key}`}><Input id={`w-${line.key}`} value={line.width} onChange={(event) => onChange({ ...line, width: event.target.value })} /></Field>
          <Field label="Height" htmlFor={`h-${line.key}`}><Input id={`h-${line.key}`} value={line.height} onChange={(event) => onChange({ ...line, height: event.target.value })} /></Field>
          <Field label="Dimension unit" htmlFor={`du-${line.key}`}>
            <select id={`du-${line.key}`} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" value={line.dimensionUnit} onChange={(event) => onChange({ ...line, dimensionUnit: event.target.value as Line["dimensionUnit"] })}>
              {DIMENSION_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </Field>
          <Field label="Pieces" htmlFor={`pc-${line.key}`}><Input id={`pc-${line.key}`} value={line.pieceCount} onChange={(event) => onChange({ ...line, pieceCount: event.target.value })} /></Field>
        </div>
      ) : null}
      {line.unit === "SHEET" ? <p className="text-sm text-muted-foreground">Sheet stock is counted in whole sheets. Dimensions are descriptive and do not change the quantity.</p> : null}
      {billed ? <p className="text-sm">Billed quantity: {formatQuantity(billed)} {UNIT_LABELS[line.unit]}</p> : null}
      {line.sourceType === "STOCK" && line.available != null ? <p className={short ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>Available {formatQuantity(line.available)} {UNIT_LABELS[line.unit]}{short ? ` · short by ${formatQuantity(d(billed ?? line.quantity).minus(line.available))}` : ""}</p> : null}
      {line.sourceType === "OUTSIDE_PURCHASE" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <p className="md:col-span-2 text-sm font-medium">Purchased externally</p>
          <Field label="Supplier" htmlFor={`sup-${line.key}`}><Input id={`sup-${line.key}`} value={line.supplierName} onChange={(event) => onChange({ ...line, supplierName: event.target.value })} /></Field>
          <Field label="Supplier reference" htmlFor={`ref-${line.key}`}><Input id={`ref-${line.key}`} value={line.supplierReference} onChange={(event) => onChange({ ...line, supplierReference: event.target.value })} /></Field>
          <Field label="Purchase cost per unit" htmlFor={`cost-${line.key}`}><Input id={`cost-${line.key}`} inputMode="decimal" value={line.purchaseCost} onChange={(event) => onChange({ ...line, purchaseCost: event.target.value })} /></Field>
          <Field label="Purchase notes" htmlFor={`pnotes-${line.key}`}><Input id={`pnotes-${line.key}`} value={line.purchaseNotes} onChange={(event) => onChange({ ...line, purchaseNotes: event.target.value })} /></Field>
        </div>
      ) : null}
    </section>
  );
}

function NewCustomerDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (customer: { id: string; name: string; phone: string }) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const mutation = useMutation({
    mutationFn: () => createCustomerInline({ name, phone }),
    onSuccess: (customer) => {
      toast.success("Customer added.");
      onCreated(customer);
      onOpenChange(false);
      setName("");
      setPhone("");
    },
    onError: (error) => toast.error(getErrorMessage(error, "The customer could not be added.")),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New customer" description="The invoice draft stays open.">
        <div className="space-y-4">
          <Field label="Name" htmlFor="new-name"><Input id="new-name" value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Phone" htmlFor="new-phone"><Input id="new-phone" value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>Save customer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function billedQuantity(line: Line) {
  try {
    return computeBilledQuantity({
      unit: line.unit,
      quantity: line.quantity || "0",
      width: line.width || null,
      height: line.height || null,
      dimensionUnit: line.dimensionUnit,
      pieceCount: line.pieceCount ? Number(line.pieceCount) : null,
    }).toString();
  } catch {
    return null;
  }
}

function previewTotals(lines: Line[], discount: string, taxEnabled: boolean, taxRate: string) {
  try {
    const lineTotals = lines.map((line) => {
      const quantity = billedQuantity(line);
      if (!quantity) return "0";
      return computeLineTotal(quantity, line.unitPrice || "0", line.discountAmount || "0").toString();
    });
    const totals = computeInvoiceTotals({ lineTotals, invoiceDiscount: discount || "0", taxEnabled, taxRatePercent: taxRate });
    return { subtotal: totals.subtotal.toFixed(2), discount: totals.discountAmount.toFixed(2), tax: totals.taxAmount.toFixed(2), total: totals.totalAmount.toFixed(2) };
  } catch {
    return { subtotal: "0.00", discount: "0.00", tax: "0.00", total: "0.00" };
  }
}

function payload(customerId: string, invoiceDate: string, dueDate: string, discountAmount: string, notes: string, terms: string, lines: Line[]) {
  return {
    customerId,
    invoiceDate,
    dueDate,
    discountAmount,
    notes,
    terms,
    lines: lines.map((line) => ({
      productId: line.productId || null,
      itemName: line.itemName,
      description: line.description,
      sourceType: line.sourceType,
      quantity: billedQuantity(line) || line.quantity,
      unit: line.unit,
      width: line.width || null,
      height: line.height || null,
      dimensionUnit: line.width && line.height ? line.dimensionUnit : null,
      pieceCount: line.pieceCount ? Number(line.pieceCount) : null,
      unitPrice: line.unitPrice,
      discountAmount: line.discountAmount,
      purchaseCost: line.purchaseCost || null,
      supplierName: line.supplierName,
      supplierReference: line.supplierReference,
      purchaseNotes: line.purchaseNotes,
    })),
  };
}

function Total({ label, value, currency = "PKR", strong }: { label: string; value: string; currency?: string; strong?: boolean }) {
  return <div className={strong ? "flex justify-between text-base font-semibold" : "flex justify-between"}><span>{label}</span><span>{formatMoney(value, currency)}</span></div>;
}
