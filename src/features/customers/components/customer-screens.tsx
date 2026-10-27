"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type AppColumn } from "@/components/data/data-table";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DataTable } from "@/components/data/data-table";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/feedback/states";
import { PageHeader, Pagination } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { customerSchema } from "@/features/customers/schemas/customer.schema";
import { archiveCustomer, getCustomer, listCustomers, saveCustomer } from "@/features/customers/services/customer.service";
import { getErrorMessage } from "@/lib/axios";
import { formatDateOnly, formatMoney } from "@/lib/format";
import { useDebounced } from "@/lib/use-debounced";
import { queryKeys } from "@/query/query-keys";
import type { CustomerDto } from "@/lib/types";
import type { z } from "zod";

type FormInput = z.input<typeof customerSchema>;
type Values = z.output<typeof customerSchema>;

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const customers = useQuery({
    queryKey: queryKeys.customers.list({ debounced, page }),
    queryFn: () => listCustomers({ search: debounced, page, pageSize: 20 }),
  });
  const columns: AppColumn<CustomerDto>[] = [
    { header: "Customer", cell: ({ row }) => <Link className="font-medium hover:underline" href={`/customers/${row.original.id}`}>{row.original.name}</Link> },
    { header: "Phone", cell: ({ row }) => row.original.phone },
    { header: "Email", cell: ({ row }) => row.original.email || "—" },
    { header: "Invoiced", cell: ({ row }) => formatMoney(row.original.totalInvoiced) },
    { header: "Paid", cell: ({ row }) => formatMoney(row.original.totalPaid) },
    { header: "Outstanding", cell: ({ row }) => formatMoney(row.original.outstanding) },
  ];
  return (
    <div className="space-y-8">
      <PageHeader title="Customers" description="Balances come from issued invoices and recorded payments." actions={<Button asChild><Link href="/customers/new"><Plus className="h-4 w-4" />Add customer</Link></Button>} />
      <div className="surface-card p-4"><Input aria-label="Search customers" placeholder="Name, phone, or email" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></div>
      {customers.isLoading ? <TableSkeleton /> : null}
      {customers.isError ? <ErrorState onRetry={() => void customers.refetch()} /> : null}
      {customers.data?.items.length === 0 ? <EmptyState icon={Users} title="No customers" description="Add a customer before creating an invoice." action={<Button asChild><Link href="/customers/new">Add customer</Link></Button>} /> : null}
      {customers.data && customers.data.items.length > 0 ? <div className="space-y-4"><DataTable columns={columns} data={customers.data.items} /><Pagination page={customers.data.meta.page} pageCount={customers.data.meta.pageCount} onPage={setPage} /></div> : null}
    </div>
  );
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
      router.push(`/customers/${saved.id}`);
    },
    onError: (error) => toast.error(getErrorMessage(error, "The customer could not be saved.")),
  });
  return (
    <form className="space-y-8" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <PageHeader title={customer ? "Edit customer" : "New customer"} />
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

export function CustomerDetail({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const customer = useQuery({ queryKey: queryKeys.customers.detail(id), queryFn: () => getCustomer(id) });
  const [open, setOpen] = useState(false);
  const archive = useMutation({
    mutationFn: () => archiveCustomer(id),
    onSuccess: async () => {
      toast.success("Customer archived.");
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
  if (customer.isLoading) return <TableSkeleton />;
  if (!customer.data) return <ErrorState onRetry={() => void customer.refetch()} />;
  const item = customer.data;
  return (
    <div className="space-y-8">
      <PageHeader title={item.name} description={item.phone} actions={<><Button variant="outline" asChild><Link href={`/customers/${id}/edit`}>Edit</Link></Button>{item.isActive ? <Button variant="destructive" onClick={() => setOpen(true)}>Archive</Button> : null}</>} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="surface-card p-5"><p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Invoiced</p><p className="mt-2 text-2xl font-semibold">{formatMoney(item.totalInvoiced)}</p></div>
        <div className="surface-card p-5"><p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Paid</p><p className="mt-2 text-2xl font-semibold">{formatMoney(item.totalPaid)}</p></div>
        <div className="surface-card p-5"><p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Outstanding</p><p className="mt-2 text-2xl font-semibold">{formatMoney(item.outstanding)}</p></div>
      </div>
      <section className="surface-card p-5">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <div className="mt-4 space-y-3">
          {item.invoices.map((invoice) => (
            <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
              <span>{invoice.invoiceNumber ?? "Draft"} · {formatDateOnly(invoice.invoiceDate)}</span>
              <span>{formatMoney(invoice.outstanding)} outstanding</span>
            </Link>
          ))}
          {item.invoices.length === 0 ? <p className="text-sm text-muted-foreground">No invoices for this customer.</p> : null}
        </div>
      </section>
      <ConfirmDialog open={open} onOpenChange={setOpen} title="Archive this customer?" description="Past invoices stay available. The customer cannot be used on a new invoice." confirmLabel="Archive" destructive loading={archive.isPending} onConfirm={() => archive.mutate()} />
    </div>
  );
}
