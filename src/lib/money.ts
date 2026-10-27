import Decimal from "decimal.js";

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function d(value: Decimal.Value) {
  let next: Decimal;
  try {
    next = new Decimal(value);
  } catch {
    throw new Error("INVALID_NUMBER");
  }
  if (!next.isFinite()) throw new Error("INVALID_NUMBER");
  return next;
}

export function money(value: Decimal.Value) {
  return d(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function qty(value: Decimal.Value) {
  return d(value).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
}

export function moneyString(value: Decimal.Value) {
  return money(value).toFixed(2);
}

export function qtyString(value: Decimal.Value) {
  return qty(value).toFixed(3);
}

export function isPositive(value: Decimal.Value) {
  return d(value).gt(0);
}

export function isNonNegative(value: Decimal.Value) {
  return d(value).gte(0);
}
