import { describe, expect, it } from "vitest";
import { computeBilledQuantity } from "@/lib/glass";

describe("glass area", () => {
  it("converts inches to square feet", () => {
    const area = computeBilledQuantity({
      unit: "SQ_FT",
      quantity: "1",
      width: "48",
      height: "36",
      dimensionUnit: "IN",
      pieceCount: 2,
    });
    expect(area.toFixed(3)).toBe("24.000");
  });

  it("does not convert sheet quantity from dimensions", () => {
    const quantity = computeBilledQuantity({
      unit: "SHEET",
      quantity: "3",
      width: "48",
      height: "36",
      dimensionUnit: "IN",
      pieceCount: 2,
    });
    expect(quantity.toFixed(3)).toBe("3.000");
  });

  it("rejects a single dimension", () => {
    expect(() => computeBilledQuantity({ unit: "SQ_FT", quantity: "1", width: "10", height: null, dimensionUnit: "IN", pieceCount: 1 })).toThrow("DIMENSIONS_INCOMPLETE");
  });
});
