"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { InvoiceSheet, moneyLabel } from "@/features/invoices/components/invoice-sheet";
import { InvoiceSourcePicker } from "@/features/invoices/components/invoice-source-picker";
import { customerSchema } from "@/features/customers/schemas/customer.schema";
import { createCustomerInline, getInvoiceSettings, issueInvoice, saveInvoice, searchCustomers, searchProducts } from "@/features/invoices/services/invoice.service";
import { getErrorMessage, getFieldError } from "@/lib/axios";
import { formatDateOnly, formatQuantity } from "@/lib/format";
import { computeInvoiceTotals, computeLineTotal } from "@/lib/invoice-math";
import { d } from "@/lib/money";
import { todayInput, useDebounced } from "@/lib/use-debounced";
import { queryKeys } from "@/query/query-keys";
import type { InvoiceDto } from "@/lib/types";

const INVOICE_NOTES = "Thank you for your business. Please check the goods at the time of delivery.";
const INVOICE_TERMS = "Payment is due on delivery. Goods once sold will not be taken back. E. & O.E.";

type Line = {
  key: string;
  productId: string;
  itemName: string;
  description: string;
  sourceType: "STOCK" | "OUTSIDE_PURCHASE";
  quantity: string;
  unitPrice: string;
  available: string | null;
};

function blankLine(): Line {
  return { key: crypto.randomUUID(), productId: "", itemName: "", description: "", sourceType: "STOCK", quantity: "1", unitPrice: "0", available: null };
}

function fromInvoice(invoice: InvoiceDto): Line[] {
  return invoice.lines.map((line) => ({
    key: line.id,
    productId: line.productId ?? "",
    itemName: line.itemName,
    description: line.description ?? "",
    sourceType: line.sourceType,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    available: null,
  }));
}

export function InvoiceEditor({ invoice }: { invoice?: InvoiceDto }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: queryKeys.settings.current, queryFn: getInvoiceSettings });
  const [customer, setCustomer] = useState<{ id: string; name: string; phone: string; address: string | null } | null>(
    invoice ? { id: invoice.customerId, name: invoice.customerName, phone: invoice.customerPhone, address: invoice.customerAddress } : null,
  );
  const [customerSearch, setCustomerSearch] = useState(invoice ? `${invoice.customerName} · ${invoice.customerPhone}` : "");
  const [invoiceDate, setInvoiceDate] = useState(invoice ? invoice.invoiceDate.slice(0, 10) : todayInput());
  const [notes, setNotes] = useState(invoice?.notes ?? INVOICE_NOTES);
  const [terms, setTerms] = useState(invoice?.terms ?? INVOICE_TERMS);
  const [lines, setLines] = useState<Line[]>(invoice ? fromInvoice(invoice) : [blankLine()]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const debouncedCustomer = useDebounced(customerSearch);
  const customerLabel = customer ? `${customer.name} · ${customer.phone}` : "";
  const customerQuery = customerSearch.trim();
  const searchingCustomers = customerQuery.length > 0 && customerQuery !== customerLabel;
  const customers = useQuery({ queryKey: queryKeys.customers.list({ debouncedCustomer, picker: true }), queryFn: () => searchCustomers(debouncedCustomer), enabled: searchingCustomers && debouncedCustomer.length > 0 });
  const preview = useMemo(() => previewTotals(lines, settings.data?.taxEnabled ?? false, settings.data?.taxRate ?? "0"), [lines, settings.data]);
  const paid = invoice?.amountPaid ?? "0.00";
  const sheetLines = useMemo(() => lines.map((line) => {
    const quantity = enteredQuantity(line)?.toString() ?? null;
    const detail = [
      line.description,
      line.sourceType === "OUTSIDE_PURCHASE" ? "Purchased externally" : "",
    ].filter(Boolean).join("\n");
    return {
      id: line.key,
      quantityLabel: quantity ? formatQuantity(quantity) : "—",
      itemName: line.itemName.trim() || "—",
      detail,
      rate: moneyLabel(line.unitPrice || "0"),
      amount: moneyLabel(lineAmount(line)),
    };
  }), [lines]);

  const save = useMutation({
    mutationFn: async (issue: boolean) => {
      const saved = await saveInvoice(invoice?.id ?? null, payload(customer?.id ?? "", invoiceDate, notes, terms, lines));
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
    <div className="space-y-6">
      <PageHeader title={invoice ? invoice.invoiceNumber ?? "Edit draft" : "New invoice"} description="Choose the source of every line. Shop stock is deducted only when you issue the invoice." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
      <div className="space-y-6">
      <section className="surface-card space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Field label="Customer" htmlFor="customer-search">
              <SearchSelect
                id="customer-search"
                value={customerSearch}
                placeholder="Search name or phone"
                onChange={(value) => {
                  setCustomerSearch(value);
                  if (value.trim() !== customerLabel) setCustomer(null);
                }}
                loading={searchingCustomers && (customerQuery !== debouncedCustomer || customers.isFetching)}
                options={(customers.data?.items ?? []).map((item) => ({ id: item.id, label: item.name, detail: item.phone }))}
                onSelect={(option) => {
                  const selected = customers.data?.items.find((item) => item.id === option.id);
                  if (!selected) return;
                  setCustomer({ id: selected.id, name: selected.name, phone: selected.phone, address: selected.address });
                  setCustomerSearch(`${selected.name} · ${selected.phone}`);
                }}
              />
            </Field>
          </div>
          <Button type="button" variant="primary" size="sm" onClick={() => setCustomerOpen(true)}>Add customer</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Invoice date" htmlFor="invoice-date"><Input id="invoice-date" type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} /></Field>
        </div>
      </section>
      <div className="space-y-4">
        {lines.map((line, index) => (
          <LineEditor key={line.key} line={line} onChange={(next) => setLines((current) => current.map((item) => item.key === line.key ? next : item))} onRemove={() => setLines((current) => current.filter((item) => item.key !== line.key))} index={index} />
        ))}
        <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, blankLine()])}>Add line</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Notes" htmlFor="notes"><Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
        <Field label="Terms" htmlFor="terms"><Textarea id="terms" value={terms} onChange={(event) => setTerms(event.target.value)} /></Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" loading={save.isPending} onClick={() => save.mutate(false)}>Save draft</Button>
        <Button loading={save.isPending} onClick={() => save.mutate(true)}>Issue invoice</Button>
      </div>
      </div>
      <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100dvh-6rem)] lg:overflow-auto">
        <InvoiceSheet
          businessName={settings.data?.businessName ?? ""}
          address={settings.data?.address}
          phone={settings.data?.phone}
          logoSrc={settings.data?.hasLogo ? "/api/settings/logo" : null}
          serial={invoice?.invoiceNumber ?? "Draft"}
          date={invoiceDate ? formatDateOnly(invoiceDate) : "—"}
          customer={customer ? [customer.name, customer.phone, customer.address].filter(Boolean).join(" · ") : "—"}
          lines={sheetLines}
          subtotal={moneyLabel(preview.subtotal)}
          taxLabel={settings.data?.taxEnabled ? settings.data.taxLabel : null}
          tax={settings.data?.taxEnabled ? moneyLabel(preview.tax) : null}
          total={moneyLabel(preview.total)}
          paid={moneyLabel(paid)}
          balance={moneyLabel(balanceAmount(preview.total, paid))}
          notes={notes}
          terms={terms}
        />
      </aside>
      </div>
      <NewCustomerDialog open={customerOpen} onOpenChange={setCustomerOpen} onCreated={(created) => { setCustomer({ id: created.id, name: created.name, phone: created.phone, address: created.address }); setCustomerSearch(`${created.name} · ${created.phone}`); }} />
    </div>
  );
}

function LineEditor({ line, onChange, onRemove, index }: { line: Line; onChange: (line: Line) => void; onRemove: () => void; index: number }) {
  const typed = line.itemName.trim();
  const debounced = useDebounced(typed);
  const products = useQuery({ queryKey: queryKeys.products.list({ debounced, picker: index }), queryFn: () => searchProducts(debounced), enabled: debounced.length > 0 });
  const catalog = products.data?.items ?? [];
  useEffect(() => {
    if (!typed || typed !== debounced || products.isFetching) return;
    const match = catalog.find((product) => product.name.trim().toLowerCase() === typed.toLowerCase());
    if (!match || match.id === line.productId) return;
    onChange({ ...line, productId: match.id, itemName: match.name, unitPrice: match.defaultSellingPrice, available: match.stockQuantity });
  }, [catalog, debounced, line, onChange, products.isFetching, typed]);
  const quantity = enteredQuantity(line);
  const short = line.sourceType === "STOCK" && line.available != null && quantity != null && quantity.gt(line.available);
  const customName = line.sourceType === "STOCK" && typed.length > 0 && !line.productId && typed === debounced && !products.isFetching;
  return (
    <section className="surface-card space-y-4 p-5">
      <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Line {index + 1}</h2><Button type="button" variant="destructive" size="sm" onClick={onRemove}>Remove</Button></div>
      <InvoiceSourcePicker source={line.sourceType} onChange={(sourceType) => onChange({ ...line, sourceType })} />
      <Field label="Product" htmlFor={`product-${line.key}`}>
        <SearchSelect
          id={`product-${line.key}`}
          value={line.itemName}
          placeholder="Search the catalog or type an item name"
          onChange={(value) => onChange({ ...line, itemName: value, productId: "", available: null })}
          loading={typed.length > 0 && (typed !== debounced || products.isFetching)}
          options={catalog.map((product) => ({ id: product.id, label: product.name, detail: `${formatQuantity(product.stockQuantity)} available` }))}
          onSelect={(option) => {
            const product = catalog.find((item) => item.id === option.id);
            if (!product) return;
            onChange({ ...line, productId: product.id, itemName: product.name, unitPrice: product.defaultSellingPrice, available: product.stockQuantity });
          }}
        />
      </Field>
      {customName ? <p className="text-sm text-muted-foreground">No inventory product uses this name. Pick a listed product for shop stock, or mark the line as purchased externally.</p> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Unit price" htmlFor={`price-${line.key}`}><Input id={`price-${line.key}`} inputMode="decimal" value={line.unitPrice} onChange={(event) => onChange({ ...line, unitPrice: event.target.value })} /></Field>
        <Field label="Quantity" htmlFor={`qty-${line.key}`}><Input id={`qty-${line.key}`} inputMode="decimal" value={line.quantity} onChange={(event) => onChange({ ...line, quantity: event.target.value })} /></Field>
      </div>
      {quantity ? <p className="text-sm">Billed quantity: {formatQuantity(quantity.toString())}</p> : null}
      {line.sourceType === "STOCK" && line.available != null ? <p className={short ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>Available {formatQuantity(line.available)}{short && quantity ? ` · short by ${formatQuantity(quantity.minus(line.available))}` : ""}</p> : null}
    </section>
  );
}

function NewCustomerDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (customer: { id: string; name: string; phone: string; address: string | null }) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const mutation = useMutation({
    mutationFn: () => createCustomerInline({ name, phone }),
    onSuccess: (customer) => {
      toast.success("Customer added.");
      onCreated(customer);
      onOpenChange(false);
      setName("");
      setPhone("");
      setErrors({});
    },
    onError: (error) => {
      setErrors({ name: getFieldError(error, "name"), phone: getFieldError(error, "phone") });
      toast.error(getErrorMessage(error, "The customer could not be added."));
    },
  });
  function save() {
    const parsed = customerSchema.safeParse({ name, phone });
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      setErrors({ name: fields.name?.[0], phone: fields.phone?.[0] });
      return;
    }
    setErrors({});
    mutation.mutate();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New customer" description="The invoice draft stays open.">
        <div className="space-y-4">
          <Field label="Name" htmlFor="new-name" error={errors.name}><Input id="new-name" value={name} onChange={(event) => { setName(event.target.value); setErrors((current) => ({ ...current, name: undefined })); }} /></Field>
          <Field label="Phone" htmlFor="new-phone" error={errors.phone}><Input id="new-phone" value={phone} onChange={(event) => { setPhone(event.target.value); setErrors((current) => ({ ...current, phone: undefined })); }} /></Field>
          <Button type="button" loading={mutation.isPending} onClick={save}>Save customer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function lineAmount(line: Line) {
  const quantity = enteredQuantity(line);
  if (!quantity) return "0.00";
  try {
    return computeLineTotal(quantity.toString(), line.unitPrice || "0", "0").toFixed(2);
  } catch {
    return "0.00";
  }
}

function balanceAmount(total: string, paid: string) {
  try {
    const value = d(total || "0").minus(d(paid || "0"));
    return value.isNegative() ? "0.00" : value.toFixed(2);
  } catch {
    return "0.00";
  }
}

function enteredQuantity(line: Line) {
  try {
    const quantity = d(line.quantity || "0");
    if (!quantity.isFinite() || quantity.lte(0)) return null;
    return quantity;
  } catch {
    return null;
  }
}

function previewTotals(lines: Line[], taxEnabled: boolean, taxRate: string) {
  try {
    const lineTotals = lines.map((line) => {
      const quantity = enteredQuantity(line);
      if (!quantity) return "0";
      return computeLineTotal(quantity.toString(), line.unitPrice || "0", "0").toString();
    });
    const totals = computeInvoiceTotals({ lineTotals, invoiceDiscount: "0", taxEnabled, taxRatePercent: taxRate });
    return { subtotal: totals.subtotal.toFixed(2), tax: totals.taxAmount.toFixed(2), total: totals.totalAmount.toFixed(2) };
  } catch {
    return { subtotal: "0.00", tax: "0.00", total: "0.00" };
  }
}

function payload(customerId: string, invoiceDate: string, notes: string, terms: string, lines: Line[]) {
  return {
    customerId,
    invoiceDate,
    dueDate: "",
    discountAmount: "0",
    notes,
    terms,
    lines: lines.map((line) => ({
      productId: line.productId || null,
      itemName: line.itemName,
      description: line.description,
      sourceType: line.sourceType,
      quantity: line.quantity,
      unit: "SQ_FT",
      width: null,
      height: null,
      dimensionUnit: null,
      pieceCount: null,
      unitPrice: line.unitPrice,
      discountAmount: "0",
      purchaseCost: null,
      supplierName: "",
      supplierReference: "",
      purchaseNotes: "",
    })),
  };
}

