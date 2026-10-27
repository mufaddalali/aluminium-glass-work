"use client";

import { useQuery } from "@tanstack/react-query";
import { InvoiceEditor } from "@/features/invoices/components/invoice-editor";
import { getInvoice } from "@/features/invoices/services/invoice.service";
import { ErrorState } from "@/components/feedback/states";
import { TableSkeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/query/query-keys";

export function EditInvoicePage({ id }: { id: string }) {
  const invoice = useQuery({ queryKey: queryKeys.invoices.detail(id), queryFn: () => getInvoice(id) });
  if (invoice.isLoading) return <TableSkeleton />;
  if (!invoice.data) return <ErrorState onRetry={() => void invoice.refetch()} />;
  if (invoice.data.status !== "DRAFT") return <ErrorState title="This invoice is locked" description="Issued invoices stay as they were when issued." />;
  return <InvoiceEditor invoice={invoice.data} />;
}
