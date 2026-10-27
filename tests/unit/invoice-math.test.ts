import { describe, expect, it } from "vitest";
import { computeInvoiceTotals, computeLineTotal, outstandingAmount, statusFromPayments } from "@/lib/invoice-math";

describe("invoice math", () => {
  it("rounds money half up and rejects an excessive discount", () => {
    expect(computeLineTotal("2.5", "100.005", "0").toFixed(2)).toBe("250.01");
    expect(() => computeLineTotal("1", "10", "11")).toThrow("DISCOUNT_EXCEEDS_LINE");
  });

  it("applies optional tax after the invoice discount", () => {
    const totals = computeInvoiceTotals({ lineTotals: ["100.00", "50.00"], invoiceDiscount: "10", taxEnabled: true, taxRatePercent: "10" });
    expect(totals.taxAmount.toFixed(2)).toBe("14.00");
    expect(totals.totalAmount.toFixed(2)).toBe("154.00");
  });

  it("derives payment status from recorded amounts", () => {
    expect(statusFromPayments("50000", "0")).toBe("ISSUED");
    expect(statusFromPayments("50000", "20000")).toBe("PARTIALLY_PAID");
    expect(outstandingAmount("50000", "20000").toFixed(2)).toBe("30000.00");
    expect(statusFromPayments("50000", "50000")).toBe("PAID");
  });
});
