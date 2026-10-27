"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { MetricStrip } from "@/components/ui/metric";
import { TableSkeleton } from "@/components/ui/skeleton";
import { deleteDraft, getInvoice, getInvoiceSettings, issueInvoice, recordPayment, voidInvoice } from "@/features/invoices/services/invoice.service";
import { getErrorMessage } from "@/lib/axios";
import { formatDateOnly, formatMoney, formatQuantity } from "@/lib/format";
import { d } from "@/lib/money";
import { invoiceShareMessage, whatsAppLink } from "@/lib/whatsapp";
import { todayInput } from "@/lib/use-debounced";
import { queryKeys } from "@/query/query-keys";

export function InvoiceDetail({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const invoice = useQuery({ queryKey: queryKeys.invoices.detail(id), queryFn: () => getInvoice(id) });
  const settings = useQuery({ queryKey: queryKeys.settings.current, queryFn: getInvoiceSettings });
  const [voidOpen, setVoidOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payKind, setPayKind] = useState<"PAYMENT" | "REFUND">("PAYMENT");
  const [paySession, setPaySession] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
  };
  const issue = useMutation({ mutationFn: () => issueInvoice(id), onSuccess: async () => { toast.success("Invoice issued."); await refresh(); }, onError: (error) => toast.error(getErrorMessage(error, "The invoice could not be issued.")) });
  const remove = useMutation({ mutationFn: () => deleteDraft(id), onSuccess: () => { router.push("/invoices"); router.refresh(); } });
  const voiding = useMutation({ mutationFn: () => voidInvoice(id, reason), onSuccess: async () => { toast.success("Invoice voided."); setVoidOpen(false); await refresh(); }, onError: (error) => toast.error(getErrorMessage(error, "The invoice could not be voided.")) });

  if (invoice.isLoading) return <TableSkeleton />;
  if (!invoice.data) return <ErrorState onRetry={() => void invoice.refetch()} />;
  const item = invoice.data;
  const share = item.invoiceNumber ? whatsAppLink(item.customerPhone, invoiceShareMessage({ businessName: settings.data?.businessName ?? "Invoice", invoiceNumber: item.invoiceNumber, total: formatMoney(item.totalAmount, ""), paid: formatMoney(item.amountPaid, ""), outstanding: formatMoney(item.outstanding, "") })) : null;

  return (
    <div className="space-y-8">
      <PageHeader title={item.invoiceNumber ?? "Draft invoice"} description={`${item.customerName} · ${formatDateOnly(item.invoiceDate)}`} actions={
        <>
          <StatusBadge status={item.status} />
          {item.status === "DRAFT" ? <Button variant="outline" asChild><Link href={`/invoices/${id}/edit`}>Edit</Link></Button> : null}
          {item.status === "DRAFT" ? <Button loading={issue.isPending} onClick={() => issue.mutate()}>Issue</Button> : null}
          {item.status === "DRAFT" ? <Button variant="destructive" onClick={() => setDeleteOpen(true)}>Delete draft</Button> : null}
          {item.status !== "DRAFT" && item.status !== "VOID" ? <Button onClick={() => { setPayKind("PAYMENT"); setPaySession((value) => value + 1); setPayOpen(true); }}>Record payment</Button> : null}
          {item.status !== "DRAFT" && item.status !== "VOID" && d(item.amountPaid).gt(0) ? <Button variant="outline" onClick={() => { setPayKind("REFUND"); setPaySession((value) => value + 1); setPayOpen(true); }}>Record refund</Button> : null}
          {item.status !== "DRAFT" ? <Button variant="outline" asChild><Link href={`/invoices/${id}/print`}>Print</Link></Button> : null}
          {share ? <Button variant="outline" asChild><a href={share} target="_blank" rel="noreferrer">WhatsApp</a></Button> : null}
          {item.status !== "DRAFT" && item.status !== "VOID" ? <Button variant="destructive" onClick={() => setVoidOpen(true)}>Void</Button> : null}
        </>
      } />
      <MetricStrip items={[
        { label: "Total", value: formatMoney(item.totalAmount, "") },
        { label: "Paid", value: formatMoney(item.amountPaid, "") },
        { label: "Outstanding", value: formatMoney(item.outstanding, "") },
      ]} />
      <section className="surface-card divide-y divide-border">
        {item.lines.map((line) => (
          <div key={line.id} className="space-y-1 p-5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{line.itemName}</p>
              <StatusBadge status={line.sourceType} />
            </div>
            <p className="text-muted-foreground">{formatQuantity(line.quantity)} × {formatMoney(line.unitPrice, "")}</p>
            <p className="text-end font-medium">{formatMoney(line.lineTotal, "")}</p>
          </div>
        ))}
      </section>
      <section className="surface-card p-5">
        <h2 className="text-lg font-semibold">Payments</h2>
        <div className="mt-4 space-y-3 text-sm">
          {item.payments.map((payment) => <div key={payment.id} className="flex justify-between border-t border-border pt-3"><span>{payment.kind} · {payment.paymentMethod} · {formatDateOnly(payment.paymentDate)}</span><span>{formatMoney(payment.amount, "")}</span></div>)}
          {item.payments.length === 0 ? <p className="text-muted-foreground">No payments recorded.</p> : null}
        </div>
      </section>
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent title="Void invoice" description="Stock from shop lines is restored once. Outside purchases are not added to inventory. Refund any amount already received first.">
          <Field label="Reason" htmlFor="void-reason"><Textarea id="void-reason" value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
          <Button className="mt-4" variant="destructive" loading={voiding.isPending} onClick={() => voiding.mutate()}>Void invoice</Button>
        </DialogContent>
      </Dialog>
      <PaymentDialog key={paySession} open={payOpen} onOpenChange={setPayOpen} invoiceId={id} kind={payKind} onSaved={refresh} />
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete this draft?" description="A draft has not changed stock. This removes it." confirmLabel="Delete" destructive loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}

function PaymentDialog({ open, onOpenChange, invoiceId, kind, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; invoiceId: string; kind: "PAYMENT" | "REFUND"; onSaved: () => Promise<void> }) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayInput());
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const mutation = useMutation({
    mutationFn: () => recordPayment({ invoiceId, amount, paymentDate, paymentMethod, reference, notes, kind, idempotencyKey: key }),
    onSuccess: async () => { toast.success(kind === "REFUND" ? "Refund recorded." : "Payment recorded."); onOpenChange(false); await onSaved(); },
    onError: (error) => toast.error(getErrorMessage(error, kind === "REFUND" ? "The refund could not be recorded." : "The payment could not be recorded.")),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={kind === "REFUND" ? "Record refund" : "Record payment"} description={kind === "REFUND" ? "A refund reduces the net amount paid. Voiding stays blocked until that net is zero." : "This adds a payment record. It does not edit the invoice total."}>
        <div className="space-y-4">
          <Field label="Amount" htmlFor="pay-amount"><Input id="pay-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
          <Field label="Date" htmlFor="pay-date"><Input id="pay-date" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></Field>
          <Field label="Method" htmlFor="pay-method">
            <select id="pay-method" className="control-glass h-11 w-full rounded-2xl px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CARD">Card</option><option value="MOBILE_WALLET">Mobile wallet</option><option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Reference" htmlFor="pay-ref"><Input id="pay-ref" value={reference} onChange={(event) => setReference(event.target.value)} /></Field>
          <Field label="Notes" htmlFor="pay-notes"><Textarea id="pay-notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>{kind === "REFUND" ? "Save refund" : "Save payment"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
