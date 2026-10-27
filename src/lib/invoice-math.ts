import { d, Decimal, money } from "@/lib/money";

export type InvoiceStatusName = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOID";

export function computeLineTotal(quantity: Decimal.Value, unitPrice: Decimal.Value, discount: Decimal.Value) {
  const qtyValue = d(quantity);
  const price = d(unitPrice);
  const discountValue = d(discount);
  if (qtyValue.lte(0) || price.isNegative() || discountValue.isNegative()) {
    throw new Error("INVALID_AMOUNT");
  }
  const gross = qtyValue.mul(price);
  if (discountValue.gt(gross)) throw new Error("DISCOUNT_EXCEEDS_LINE");
  return money(gross.minus(discountValue));
}

export function computeInvoiceTotals(input: {
  lineTotals: Decimal.Value[];
  invoiceDiscount: Decimal.Value;
  taxEnabled: boolean;
  taxRatePercent: Decimal.Value;
}) {
  const subtotal = money(input.lineTotals.reduce<Decimal>((sum, line) => sum.plus(d(line)), new Decimal(0)));
  const discount = d(input.invoiceDiscount);
  if (discount.isNegative()) throw new Error("INVALID_AMOUNT");
  if (discount.gt(subtotal)) throw new Error("DISCOUNT_EXCEEDS_SUBTOTAL");
  const rate = d(input.taxRatePercent);
  if (rate.isNegative()) throw new Error("INVALID_AMOUNT");
  const taxable = subtotal.minus(discount);
  const tax = input.taxEnabled ? money(taxable.mul(rate).div(100)) : money(0);
  const total = money(taxable.plus(tax));
  return {
    subtotal,
    discountAmount: money(discount),
    taxAmount: tax,
    totalAmount: total,
  };
}

export function netPaid(entries: Array<{ kind: "PAYMENT" | "REFUND"; amount: Decimal.Value }>) {
  return money(
    entries.reduce<Decimal>((sum, entry) => {
      const amount = d(entry.amount);
      return entry.kind === "REFUND" ? sum.minus(amount) : sum.plus(amount);
    }, new Decimal(0)),
  );
}

export function outstandingAmount(total: Decimal.Value, paid: Decimal.Value) {
  const value = money(d(total).minus(d(paid)));
  return value.isNegative() ? money(0) : value;
}

export function statusFromPayments(total: Decimal.Value, paid: Decimal.Value): Exclude<InvoiceStatusName, "DRAFT" | "VOID"> {
  const totalValue = money(total);
  const paidValue = money(paid);
  if (paidValue.lte(0)) return totalValue.lte(0) ? "PAID" : "ISSUED";
  if (paidValue.gte(totalValue)) return "PAID";
  return "PARTIALLY_PAID";
}
