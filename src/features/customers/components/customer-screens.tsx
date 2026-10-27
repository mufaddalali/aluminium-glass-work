"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type AppColumn } from "@/components/data/data-table";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DataTable } from "@/components/data/data-table";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageHeader, Pagination } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { MetricStrip } from "@/components/ui/metric";
import { RowActions } from "@/components/data/row-actions";
import { SearchSelect } from "@/components/ui/search-select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { customerSchema } from "@/features/customers/schemas/customer.schema";
import { deleteCustomer, deleteCustomers, getCustomer, listCustomers, saveCustomer } from "@/features/customers/services/customer.service";
import { getErrorMessage } from "@/lib/axios";
import { formatDateOnly, formatMoney } from "@/lib/format";
import { useDebounced } from "@/lib/use-debounced";
import { queryKeys } from "@/query/query-keys";
import type { CustomerDto } from "@/lib/types";
import type { z } from "zod";

type FormInput = z.input<typeof customerSchema>;
type Values = z.output<typeof customerSchema>;

export function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [viewing, setViewing] = useState<CustomerDto | null>(null);
  const debounced = useDebounced(search);
  const customers = useQuery({
    queryKey: queryKeys.customers.list({ debounced, page }),
    queryFn: () => listCustomers({ search: debounced, page, pageSize: 20 }),
  });
  useEffect(() => { setSelected([]); }, [debounced, page]);
  const visibleIds = customers.data?.items.map((item) => item.id) ?? [];
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => deleteCustomers(ids),
    onSuccess: async (result) => {
      setBulkOpen(false);
      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      const message = bulkDeleteMessage(result.deleted, result.blocked);
      if (result.deleted === 0) toast.error(message);
      else toast.success(message);
    },
    onError: (error) => {
      setBulkOpen(false);
      toast.error(getErrorMessage(error, "The customers could not be deleted."));
    },
  });
  const columns: AppColumn<CustomerDto>[] = [
    {
      id: "select",
      header: () => <SelectCheckbox checked={allSelected} indeterminate={selected.length > 0 && !allSelected} label="Select all customers on this page" onChange={(checked) => setSelected(checked ? visibleIds : [])} />,
      cell: ({ row }) => <SelectCheckbox checked={selected.includes(row.original.id)} label={`Select ${row.original.name}`} onChange={(checked) => setSelected((current) => checked ? (current.includes(row.original.id) ? current : [...current, row.original.id]) : current.filter((id) => id !== row.original.id))} />,
    },
    { header: "Customer", cell: ({ row }) => <button type="button" className="font-medium hover:underline" onClick={() => setViewing(row.original)}>{row.original.name}</button> },
    { header: "Phone", cell: ({ row }) => row.original.phone },
    { header: "Email", cell: ({ row }) => row.original.email || "—" },
    { header: "Invoiced", cell: ({ row }) => formatMoney(row.original.totalInvoiced) },
    { header: "Paid", cell: ({ row }) => formatMoney(row.original.totalPaid) },
    { header: "Outstanding", cell: ({ row }) => formatMoney(row.original.outstanding) },
    { header: "Actions", cell: ({ row }) => <div className="flex gap-2"><RowActions editHref={`/customers/${row.original.id}/edit`} /><DeleteCustomerButton id={row.original.id} size="sm" /></div> },
  ];
  return (
    <div className="space-y-8">
      <PageHeader title="Customers" description="Balances come from issued invoices and recorded payments." actions={<Button asChild><Link href="/customers/new"><Plus className="h-4 w-4" />Add customer</Link></Button>} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-md flex-1"><SearchSelect ariaLabel="Search customers" placeholder="Name, phone, or email" value={search} onChange={(value) => { setSearch(value); setPage(1); }} loading={search !== debounced || customers.isFetching} /></div>
        {selected.length > 0 ? <Button type="button" variant="destructive" size="sm" onClick={() => setBulkOpen(true)}>Delete selected ({selected.length})</Button> : null}
      </div>
      {customers.isLoading ? <TableSkeleton /> : null}
      {customers.isError ? <ErrorState onRetry={() => void customers.refetch()} /> : null}
      {customers.data?.items.length === 0 ? <EmptyState icon={Users} title="No customers" description="Add a customer before creating an invoice." action={<Button asChild><Link href="/customers/new">Add customer</Link></Button>} /> : null}
      {customers.data && customers.data.items.length > 0 ? <div className="space-y-4"><DataTable columns={columns} data={customers.data.items} /><Pagination page={customers.data.meta.page} pageCount={customers.data.meta.pageCount} onPage={setPage} /></div> : null}
      <ConfirmDialog open={bulkOpen} onOpenChange={setBulkOpen} title={selected.length === 1 ? "Delete this customer?" : `Delete ${selected.length} customers?`} description="Customers who already have invoices will be kept." confirmLabel="Delete" destructive loading={bulkDelete.isPending} onConfirm={() => bulkDelete.mutate(selected)} />
      <CustomerViewDialog customer={viewing} onOpenChange={(open) => { if (!open) setViewing(null); }} />
    </div>
  );
}

function bulkDeleteMessage(deleted: number, blocked: number) {
  if (deleted === 0) return blocked === 1 ? "This customer has invoices and cannot be deleted." : "These customers have invoices and cannot be deleted.";
  const removed = deleted === 1 ? "Deleted 1 customer." : `Deleted ${deleted} customers.`;
  if (blocked === 0) return removed;
  const kept = blocked === 1 ? "1 customer has invoices and was kept." : `${blocked} customers have invoices and were kept.`;
  return `${removed} ${kept}`;
}

function CustomerViewDialog({ customer, onOpenChange }: { customer: CustomerDto | null; onOpenChange: (open: boolean) => void }) {
  const detail = useQuery({
    queryKey: queryKeys.customers.detail(customer?.id ?? "none"),
    queryFn: () => getCustomer(customer!.id),
    enabled: Boolean(customer),
  });
  const item = detail.data ?? customer;
  return (
    <Dialog open={Boolean(customer)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" title={item?.name ?? "Customer"} description={item?.phone}>
        {item ? (
          <div className="space-y-6">
            <div className="flex justify-end"><Button variant="outline" size="sm" asChild><Link href={`/customers/${item.id}/edit`}>Edit</Link></Button></div>
            <MetricStrip items={[
              { label: "Invoiced", value: formatMoney(item.totalInvoiced) },
              { label: "Paid", value: formatMoney(item.totalPaid) },
              { label: "Outstanding", value: formatMoney(item.outstanding) },
            ]} />
            <section>
              <h2 className="text-lg font-semibold">Invoices</h2>
              <div className="mt-4 space-y-3">
                {detail.isLoading ? <TableSkeleton /> : null}
                {detail.isError ? <ErrorState onRetry={() => void detail.refetch()} /> : null}
                {detail.data?.invoices.map((invoice) => (
                  <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                    <span>{invoice.invoiceNumber ?? "Draft"} · {formatDateOnly(invoice.invoiceDate)}</span>
                    <span>{formatMoney(invoice.outstanding)} outstanding</span>
                  </Link>
                ))}
                {detail.data && detail.data.invoices.length === 0 ? <p className="text-sm text-muted-foreground">No invoices for this customer.</p> : null}
              </div>
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SelectCheckbox({ checked, indeterminate, label, onChange }: { checked: boolean; indeterminate?: boolean; label: string; onChange: (checked: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate) && !checked;
  }, [checked, indeterminate]);
  return <input ref={ref} type="checkbox" className="h-4 w-4 accent-primary" checked={checked} aria-label={label} onChange={(event) => onChange(event.target.checked)} />;
}

export function CustomerForm({ customer }: { customer?: CustomerDto }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<FormInput, unknown, Values>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      alternatePhone: customer?.alternatePhone ?? "",
      email: customer?.email ?? "",
      address: customer?.address ?? "",
      notes: customer?.notes ?? "",
    },
  });
  const mutation = useMutation({
    mutationFn: (values: Values) => saveCustomer(customer?.id ?? null, values),
    onSuccess: async (saved) => {
      toast.success("Customer saved.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      if (!customer) router.push(`/customers/${saved.id}/edit`);
    },
    onError: (error) => toast.error(getErrorMessage(error, "The customer could not be saved.")),
  });
  return (
    <form className="space-y-8" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <PageHeader title={customer ? "Edit customer" : "New customer"} actions={customer ? <DeleteCustomerButton id={customer.id} onDeleted={() => router.push("/customers")} /> : undefined} />
      <div className="surface-card grid gap-4 p-5 md:grid-cols-2">
        <Field label="Name" htmlFor="name" error={form.formState.errors.name?.message}><Input id="name" {...form.register("name")} /></Field>
        <Field label="Phone" htmlFor="phone" error={form.formState.errors.phone?.message}><Input id="phone" {...form.register("phone")} /></Field>
        <Field label="Alternate phone" htmlFor="alternatePhone"><Input id="alternatePhone" {...form.register("alternatePhone")} /></Field>
        <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}><Input id="email" {...form.register("email")} /></Field>
        <div className="md:col-span-2"><Field label="Address" htmlFor="address"><Textarea id="address" {...form.register("address")} /></Field></div>
        <div className="md:col-span-2"><Field label="Notes" htmlFor="notes"><Textarea id="notes" {...form.register("notes")} /></Field></div>
      </div>
      <Button type="submit" loading={mutation.isPending}>Save customer</Button>
    </form>
  );
}

export function EditCustomer({ id }: { id: string }) {
  const customer = useQuery({ queryKey: queryKeys.customers.detail(id), queryFn: () => getCustomer(id) });
  if (customer.isLoading) return <TableSkeleton />;
  if (!customer.data) return <ErrorState onRetry={() => void customer.refetch()} />;
  return <CustomerForm customer={customer.data} />;
}

function DeleteCustomerButton({ id, size, onDeleted }: { id: string; size?: "sm"; onDeleted?: () => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteCustomer(id),
    onSuccess: async () => {
      toast.success("Customer deleted.");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      onDeleted?.();
    },
    onError: (error) => {
      setOpen(false);
      toast.error(getErrorMessage(error, "The customer could not be deleted."));
    },
  });
  return (
    <>
      <Button type="button" variant="destructive" size={size} onClick={() => setOpen(true)}>Delete</Button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title="Delete this customer?" description="This removes the customer. A customer who already has invoices cannot be deleted." confirmLabel="Delete" destructive loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </>
  );
}
