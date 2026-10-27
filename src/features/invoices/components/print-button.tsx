"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button className="no-print rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={() => window.print()}>
      <Printer className="me-2 inline h-4 w-4" />
      Print or save PDF
    </button>
  );
}
