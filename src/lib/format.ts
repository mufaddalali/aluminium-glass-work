import { Decimal, d } from "@/lib/money";

type Amount = Decimal.Value;

export function formatMoney(amount: Amount, currency = "PKR") {
  const value = new Decimal(amount);
  const sign = value.isNegative() ? "-" : "";
  const [whole, fraction] = value.abs().toFixed(2).split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const number = `${grouped}.${fraction ?? "00"}`;
  return currency ? `${sign}${currency} ${number}` : `${sign}${number}`;
}

export function formatQuantity(amount: Amount) {
  return d(amount).toFixed(3).replace(/\.?0+$/, "");
}

export function formatDateOnly(value: string | Date) {
  const iso = value instanceof Date ? value.toISOString() : value;
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value instanceof Date ? value : new Date(value));
}

export function toDateInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.slice(0, 10);
}
