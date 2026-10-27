import { d, Decimal, qty } from "@/lib/money";

export const INVENTORY_UNITS = [
  "SQ_FT",
  "SQ_M",
  "RUNNING_FT",
  "METER",
  "PIECE",
  "SHEET",
  "KILOGRAM",
] as const;

export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

export const DIMENSION_UNITS = ["MM", "CM", "IN", "FT", "M"] as const;
export type DimensionUnit = (typeof DIMENSION_UNITS)[number];

export const AREA_UNITS = ["SQ_FT", "SQ_M"] as const;

export const UNIT_LABELS: Record<InventoryUnit, string> = {
  SQ_FT: "sq ft",
  SQ_M: "sq m",
  RUNNING_FT: "running ft",
  METER: "m",
  PIECE: "piece",
  SHEET: "sheet",
  KILOGRAM: "kg",
};

export const DIMENSION_LABELS: Record<DimensionUnit, string> = {
  MM: "mm",
  CM: "cm",
  IN: "in",
  FT: "ft",
  M: "m",
};

const TO_METERS: Record<DimensionUnit, Decimal> = {
  MM: new Decimal(1).div(1000),
  CM: new Decimal(1).div(100),
  IN: new Decimal("0.0254"),
  FT: new Decimal("0.3048"),
  M: new Decimal(1),
};

const SQ_M_PER_SQ_FT = new Decimal("0.09290304");

export function isAreaUnit(unit: string) {
  return unit === "SQ_FT" || unit === "SQ_M";
}

export function computeBilledQuantity(input: {
  unit: InventoryUnit;
  quantity: Decimal.Value;
  width?: Decimal.Value | null;
  height?: Decimal.Value | null;
  dimensionUnit?: DimensionUnit | null;
  pieceCount?: number | null;
}) {
  const entered = qty(input.quantity);
  if (!isAreaUnit(input.unit)) return entered;

  const widthBlank = input.width == null || input.width === "";
  const heightBlank = input.height == null || input.height === "";
  if (widthBlank && heightBlank) return entered;
  if (widthBlank || heightBlank || !input.dimensionUnit) {
    throw new Error("DIMENSIONS_INCOMPLETE");
  }

  const pieces = new Decimal(input.pieceCount ?? 1);
  if (!pieces.isInteger() || pieces.lte(0)) throw new Error("INVALID_PIECES");

  const factor = TO_METERS[input.dimensionUnit];
  const widthM = d(input.width as Decimal.Value).mul(factor);
  const heightM = d(input.height as Decimal.Value).mul(factor);
  if (widthM.lte(0) || heightM.lte(0)) throw new Error("INVALID_DIMENSIONS");

  const areaSqM = widthM.mul(heightM).mul(pieces);
  const area = input.unit === "SQ_M" ? areaSqM : areaSqM.div(SQ_M_PER_SQ_FT);
  return qty(area);
}
