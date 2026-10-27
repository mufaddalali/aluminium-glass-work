import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/features/invoices/components/print-button";
import { InvoiceSheet, moneyLabel, type InvoiceSheetLine } from "@/features/invoices/components/invoice-sheet";
import { formatDateOnly, formatQuantity } from "@/lib/format";
import { sessionCookieName } from "@/server/auth/cookie";
import { getSessionFromToken } from "@/server/auth/session";
import { getInvoice } from "@/server/services/invoice.service";
import { ensureSettings, readLogo } from "@/server/services/settings.service";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(sessionCookieName())?.value;
  const session = await getSessionFromToken(token);
  if (!session) redirect("/login");
  const { id } = await params;
  const invoice = await getInvoice(id).catch(() => null);
  if (!invoice || invoice.status === "DRAFT") notFound();
  const settings = await ensureSettings();
  const logo = await readLogo();
  const logoSrc = logo ? `data:${logo.mimeType};base64,${logo.bytes.toString("base64")}` : null;
  const lines: InvoiceSheetLine[] = invoice.lines.map((line) => ({
    id: line.id,
    quantityLabel: formatQuantity(line.quantity),
    itemName: line.itemName,
    detail: [
      line.description,
      line.width && line.height ? `${line.width} × ${line.height} ${line.dimensionUnit ?? ""}${line.pieceCount ? `, ${line.pieceCount} pcs` : ""}` : "",
      line.sourceType === "OUTSIDE_PURCHASE" ? "Purchased externally" : "",
    ].filter(Boolean).join("\n"),
    rate: moneyLabel(line.unitPrice),
    amount: moneyLabel(line.lineTotal),
  }));
  const customer = [invoice.customerName, invoice.customerPhone, invoice.customerAddress].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto max-w-3xl bg-white p-4 print-sheet">
      <div className="no-print mb-4"><PrintButton /></div>
      <InvoiceSheet
        businessName={settings.businessName}
        address={settings.address}
        phone={settings.phone}
        logoSrc={logoSrc}
        serial={invoice.invoiceNumber ?? "—"}
        date={formatDateOnly(invoice.invoiceDate)}
        customer={customer || "—"}
        lines={lines}
        subtotal={moneyLabel(invoice.subtotal)}
        taxLabel={settings.taxEnabled ? settings.taxLabel : null}
        tax={settings.taxEnabled ? moneyLabel(invoice.taxAmount) : null}
        total={moneyLabel(invoice.totalAmount)}
        paid={moneyLabel(invoice.amountPaid)}
        balance={moneyLabel(invoice.outstanding)}
        notes={invoice.notes}
        terms={invoice.terms}
        minRows={12}
      />
    </main>
  );
}
