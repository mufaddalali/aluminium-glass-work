"use client";

export function InvoiceSourcePicker({ source, onChange }: { source: "STOCK" | "OUTSIDE_PURCHASE"; onChange: (source: "STOCK" | "OUTSIDE_PURCHASE") => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Line source">
      <button type="button" aria-pressed={source === "STOCK"} className={source === "STOCK" ? "rounded-md border border-primary bg-secondary px-3 py-2 text-left text-sm font-medium" : "rounded-md border border-muted-foreground/35 hover:border-primary/50 hover:bg-muted/35 cursor-pointer px-3 py-2 text-left text-sm"} onClick={() => onChange("STOCK")}>
        From shop stock
        <span className="mt-1 block text-xs font-normal text-muted-foreground">Deducted when the invoice is issued</span>
      </button>
      <button type="button" aria-pressed={source === "OUTSIDE_PURCHASE"} className={source === "OUTSIDE_PURCHASE" ? "rounded-md border border-primary bg-secondary px-3 py-2 text-left text-sm font-medium" : "rounded-md border border-muted-foreground/35 hover:border-primary/50 hover:bg-muted/35 cursor-pointer px-3 py-2 text-left text-sm"} onClick={() => onChange("OUTSIDE_PURCHASE")}>
        Purchased externally
        <span className="mt-1 block text-xs font-normal text-muted-foreground">Billed to the customer, stock unchanged</span>
      </button>
    </div>
  );
}
