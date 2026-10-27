import { d } from "@/lib/money";

export function stockStatus(quantity: string | number, minimum: string | number) {
  const qty = d(quantity);
  if (qty.lte(0)) return "OUT" as const;
  if (qty.lte(d(minimum))) return "LOW" as const;
  return "OK" as const;
}
