// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { InvoiceSourcePicker } from "@/features/invoices/components/invoice-source-picker";

function Harness() {
  const [source, setSource] = useState<"STOCK" | "OUTSIDE_PURCHASE">("STOCK");
  return (
    <div>
      <InvoiceSourcePicker source={source} onChange={setSource} />
      {source === "OUTSIDE_PURCHASE" ? <p>Outside purchase selected</p> : <p>Deducted from stock</p>}
    </div>
  );
}

describe("invoice source", () => {
  it("switches a line to an outside purchase", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText("Deducted from stock")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /purchased externally/i }));
    expect(screen.getByText("Outside purchase selected")).toBeTruthy();
  });
});
