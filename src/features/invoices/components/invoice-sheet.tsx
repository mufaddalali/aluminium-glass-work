import { formatMoney } from "@/lib/format";

const ink = "#1a3d86";

export type InvoiceSheetLine = {
  id: string;
  quantityLabel: string;
  itemName: string;
  detail?: string | null;
  rate: string;
  amount: string;
};

export function InvoiceSheet({
  businessName,
  address,
  phone,
  logoSrc,
  serial,
  date,
  customer,
  lines,
  subtotal,
  taxLabel,
  tax,
  total,
  paid,
  balance,
  notes,
  terms,
  minRows = 8,
}: {
  businessName: string;
  address?: string | null;
  phone?: string | null;
  logoSrc?: string | null;
  serial: string;
  date: string;
  customer: string;
  lines: InvoiceSheetLine[];
  subtotal: string;
  taxLabel?: string | null;
  tax?: string | null;
  total: string;
  paid: string;
  balance: string;
  notes?: string | null;
  terms?: string | null;
  minRows?: number;
}) {
  const blankRows = Math.max(0, minRows - lines.length);

  return (
    <article className="border-2 bg-white p-3 text-[11px] text-black shadow-sm" style={{ borderColor: ink, color: ink }} aria-label="Invoice preview">
      <p className="text-center text-[10px] font-semibold tracking-[0.14em]">BILL / QUOTATION</p>
      <div className="mt-2 grid grid-cols-2 items-start gap-3 border-b pb-2" style={{ borderColor: ink }}>
        <header className="grid min-w-0 grid-cols-[auto_1fr] items-start gap-2">
          <Mark src={logoSrc} className="w-14 h-14 object-contain"/>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold">{businessName || "Business name"}</h2>
            <p className="mt-0.5 w-fit bg-blue-900 px-2 py-0.5 text-[11px] font-semibold text-white">Aluminium &amp; Glass Work</p>
            <p className="max-w-60 font-medium">{address || "Plot No. 8C, Shop No. 2, Sunset Commercial Lane 2, Phase II Extension D.H.A, Karachi."}</p>
          </div>
        </header>
        <div className="min-w-0 text-[10px] leading-snug">
        <p className="font-extrabold text-[15px] border-b border-blue-900">UPVC WINDOW &amp; DOORS</p>
        <p className="text-[10px]">Manufacture of Aluminium Windows, Doors, Partitions, Fix, Show Room Front, Kitchen Cabinets, Building Windows, UPVC Windows, Window Blinds, False Ceiling, Mirror Walls.</p>
          <p>
            <span className="font-semibold">Note:</span> All kinds of local &amp; imported glass available here.
          </p>
          <div className="mt-0.5 rounded-sm border border-blue-900 px-1 font-semibold">
            {phone ? <span>Adnan: {phone}</span> : <span>Adnan: 0336-2216852, 0345-3227516</span>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 border-b py-2" style={{ borderColor: ink }}>
        <p><span className="font-semibold">Serial No.</span> <span className="ms-2 font-medium">{serial}</span></p>
        <p className="text-end"><span className="font-semibold">Date</span> <span className="ms-2">{date}</span></p>
      </div>
      <p className="border-b py-2" style={{ borderColor: ink }}>
        <span className="font-semibold">Messrs</span>
        <span className="ms-2">{customer}</span>
      </p>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="text-center text-[10px] font-semibold uppercase">
            <th className="w-16 border px-1 py-1" style={{ borderColor: ink }}>Quantity</th>
            <th className="border px-1 py-1" style={{ borderColor: ink }}>Particulars</th>
            <th className="w-20 border px-1 py-1" style={{ borderColor: ink }}>Rate per<br />sq. ft</th>
            <th className="w-20 border px-1 py-1" style={{ borderColor: ink }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="align-top">
              <td className="border px-1 py-1.5 text-center" style={{ borderColor: ink }}>{line.quantityLabel}</td>
              <td className="border px-1 py-1.5" style={{ borderColor: ink }}>
                <p className="font-semibold">{line.itemName}</p>
                {line.detail ? <p className="whitespace-pre-wrap font-normal">{line.detail}</p> : null}
              </td>
              <td className="border px-1 py-1.5 text-end" style={{ borderColor: ink }}>{line.rate}</td>
              <td className="border px-1 py-1.5 text-end" style={{ borderColor: ink }}>{line.amount}</td>
            </tr>
          ))}
          {Array.from({ length: blankRows }).map((_, index) => (
            <tr key={`blank-${index}`} aria-hidden>
              <td className="h-7 border" style={{ borderColor: ink }} />
              <td className="border" style={{ borderColor: ink }} />
              <td className="border" style={{ borderColor: ink }} />
              <td className="border" style={{ borderColor: ink }} />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="grid grid-cols-[1fr_11rem] text-[11px]">
        <div className="flex items-end px-1 py-2 font-semibold">E.&amp;O.E.</div>
        <div>
          <TotalLine label="Subtotal" value={subtotal} />
          {taxLabel && tax ? <TotalLine label={taxLabel} value={tax} /> : null}
          <TotalLine label="Total" value={total} strong />
          {/* <TotalLine label="Paid" value={paid} />
          <TotalLine label="Balance" value={balance} /> */}
        </div>
      </div>
      {notes ? <p className="mt-2 whitespace-pre-wrap text-[10px]">{notes}</p> : null}
      {terms ? <p className="mt-1 whitespace-pre-wrap text-[10px]">{terms}</p> : null}
    </article>
  );
}

function Mark({ src, className }: { src?: string | null; className?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- the mark is a settings logo or a data URI on the printed bill
      <img src={src} alt="" className="h-12 w-12 object-contain" />
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden>
      <polygon points="32,4 58,18 58,46 32,60 6,46 6,18" fill="none" stroke="#1a3d86" strokeWidth="3" />
      <polygon points="32,14 48,23 48,41 32,50 16,41 16,23" fill="none" stroke="#1a3d86" strokeWidth="2" />
      <path d="M24 42 L32 18 L40 42 M27 34 H37" fill="none" stroke="#1a3d86" strokeWidth="2.5" />
    </svg>
  );
}

function TotalLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between gap-2 border px-1.5 py-1 font-bold" : "flex justify-between gap-2 border-x border-b px-1.5 py-1"} style={{ borderColor: ink }}>
      <span>{label}</span>
      <span className="text-end">{value}</span>
    </div>
  );
}

export function moneyLabel(value: string) {
  try {
    return formatMoney(value || "0", "");
  } catch {
    return "—";
  }
}
