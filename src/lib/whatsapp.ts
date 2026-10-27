export function whatsAppLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  let normalized = digits;
  if (digits.startsWith("0") && digits.length === 11) {
    normalized = `92${digits.slice(1)}`;
  }
  if (normalized.length < 8 || normalized.length > 15) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function invoiceShareMessage(input: {
  businessName: string;
  invoiceNumber: string;
  total: string;
  paid: string;
  outstanding: string;
}) {
  return [
    input.businessName,
    `Invoice ${input.invoiceNumber}`,
    `Total: ${input.total}`,
    `Paid: ${input.paid}`,
    `Outstanding: ${input.outstanding}`,
  ].join("\n");
}
