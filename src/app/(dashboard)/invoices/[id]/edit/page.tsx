import { EditInvoicePage } from "@/features/invoices/components/edit-invoice-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditInvoicePage id={id} />;
}
