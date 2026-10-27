import { api, unwrap } from "@/lib/axios";
import type { InvoiceDto, InvoiceListItem, PageResult, PaymentDto, ProductDto, SettingsDto, CustomerDto } from "@/lib/types";

export function listInvoices(params: Record<string, string | number | undefined>) {
  return unwrap(api.get<{ data: PageResult<InvoiceListItem> }>("/invoices", { params }));
}

export function getInvoice(id: string) {
  return unwrap(api.get<{ data: InvoiceDto }>(`/invoices/${id}`));
}

export function saveInvoice(id: string | null, body: unknown) {
  return unwrap(id ? api.patch<{ data: InvoiceDto }>(`/invoices/${id}`, body) : api.post<{ data: InvoiceDto }>("/invoices", body));
}

export function issueInvoice(id: string) {
  return unwrap(api.post<{ data: InvoiceDto }>(`/invoices/${id}/issue`));
}

export function voidInvoice(id: string, reason: string) {
  return unwrap(api.post<{ data: InvoiceDto }>(`/invoices/${id}/void`, { reason }));
}

export function deleteDraft(id: string) {
  return unwrap(api.delete<{ data: { deleted: boolean } }>(`/invoices/${id}`));
}

export function listPayments(params: Record<string, string | number | undefined>) {
  return unwrap(api.get<{ data: PageResult<PaymentDto> }>("/payments", { params }));
}

export function searchProducts(search: string) {
  return unwrap(api.get<{ data: PageResult<ProductDto> }>("/products", { params: { search, active: "true", pageSize: 8 } }));
}

export function searchCustomers(search: string) {
  return unwrap(api.get<{ data: PageResult<CustomerDto> }>("/customers", { params: { search, active: "true", pageSize: 8 } }));
}

export function createCustomerInline(body: unknown) {
  return unwrap(api.post<{ data: CustomerDto }>("/customers", body));
}

export function getInvoiceSettings() {
  return unwrap(api.get<{ data: SettingsDto }>("/settings"));
}

export function recordPayment(body: unknown) {
  return unwrap(api.post<{ data: { payment: PaymentDto; invoice: InvoiceDto } }>("/payments", body));
}
