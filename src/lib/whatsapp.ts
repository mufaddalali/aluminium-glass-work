export function whatsAppLink(phone: string, currency: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  let normalized = digits;
  if (currency === "PKR" && digits.startsWith("0") && digits.length === 11) {
    normalized = `92${digits.slice(1)}`;
  }
  if (normalized.length < 8 || normalized.length > 15) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function invoiceShareMessage(input: {
  businessName: string;
  invoiceNumber: string;
  currency: string;
  total: string;
  paid: string;
  outstanding: string;
}) {
  return [
    input.businessName,
    `Invoice ${input.invoiceNumber}`,
    `Total: ${input.currency} ${input.total}`,
    `Paid: ${input.currency} ${input.paid}`,
    `Outstanding: ${input.currency} ${input.outstanding}`,
  ].join("\n");
}
