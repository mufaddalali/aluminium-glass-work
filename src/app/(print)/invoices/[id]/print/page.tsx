import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/features/invoices/components/print-button";
import { formatDateOnly, formatMoney, formatQuantity } from "@/lib/format";
import { UNIT_LABELS } from "@/lib/glass";
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
  const currency = settings.currency;

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-black print-sheet">
      <div className="no-print mb-6"><PrintButton /></div>
      <header className="flex items-start justify-between gap-6 border-b border-neutral-300 pb-6">
        <div>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- the logo is an authenticated data URI on a print page
            <img src={logoSrc} alt="" className="mb-3 h-14 w-auto object-contain" />
          ) : null}
          <h1 className="text-2xl font-semibold">{settings.businessName}</h1>
          {settings.address ? <p className="mt-2 max-w-sm text-sm whitespace-pre-wrap">{settings.address}</p> : null}
          <p className="text-sm">{[settings.phone, settings.email].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="text-end text-sm">
          <p className="text-lg font-semibold">{invoice.invoiceNumber}</p>
          <p>Date {formatDateOnly(invoice.invoiceDate)}</p>
          {invoice.dueDate ? <p>Due {formatDateOnly(invoice.dueDate)}</p> : null}
          <p className="mt-2">{invoice.status.replaceAll("_", " ")}</p>
        </div>
      </header>
      <section className="py-6 text-sm">
        <p className="text-xs uppercase tracking-[0.08em] text-neutral-500">Customer</p>
        <p className="mt-1 font-medium">{invoice.customerName}</p>
        <p>{invoice.customerPhone}</p>
        {invoice.customerAddress ? <p className="whitespace-pre-wrap">{invoice.customerAddress}</p> : null}
      </section>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-neutral-300 text-left text-xs uppercase tracking-[0.08em]">
            <th className="py-2">Item</th>
            <th className="py-2">Qty</th>
            <th className="py-2">Rate</th>
            <th className="py-2 text-end">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.id} className="print-break border-b border-neutral-200 align-top">
              <td className="py-3 pe-3">
                <p className="font-medium">{line.itemName}</p>
                {line.description ? <p>{line.description}</p> : null}
                {line.width && line.height ? <p>{line.width} × {line.height} {line.dimensionUnit}{line.pieceCount ? `, ${line.pieceCount} pcs` : ""}</p> : null}
                {line.sourceType === "OUTSIDE_PURCHASE" ? <p>Purchased externally{line.supplierName ? ` — ${line.supplierName}` : ""}</p> : null}
              </td>
              <td className="py-3">{formatQuantity(line.quantity)} {UNIT_LABELS[line.unit]}</td>
              <td className="py-3">{formatMoney(line.unitPrice, currency)}</td>
              <td className="py-3 text-end">{formatMoney(line.lineTotal, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="ms-auto mt-6 w-64 space-y-1 text-sm">
        <Row label="Subtotal" value={formatMoney(invoice.subtotal, currency)} />
        <Row label="Discount" value={formatMoney(invoice.discountAmount, currency)} />
        {settings.taxEnabled ? <Row label={settings.taxLabel} value={formatMoney(invoice.taxAmount, currency)} /> : null}
        <Row label="Total" value={formatMoney(invoice.totalAmount, currency)} />
        <Row label="Paid" value={formatMoney(invoice.amountPaid, currency)} />
        <Row label="Balance" value={formatMoney(invoice.outstanding, currency)} />
      </section>
      {invoice.notes ? <p className="mt-8 text-sm whitespace-pre-wrap">{invoice.notes}</p> : null}
      {invoice.terms ? <p className="mt-4 text-sm whitespace-pre-wrap">{invoice.terms}</p> : null}
      <div className="mt-16 grid grid-cols-2 gap-8 text-sm">
        <div className="border-t border-neutral-400 pt-2">Customer signature</div>
        <div className="border-t border-neutral-400 pt-2">For {settings.businessName}</div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span>{label}</span><span>{value}</span></div>;
}
