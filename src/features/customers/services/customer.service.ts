import { api, unwrap } from "@/lib/axios";
import type { CustomerDto, InvoiceListItem, PageResult } from "@/lib/types";

export type CustomerDetail = CustomerDto & { invoices: InvoiceListItem[] };

export function listCustomers(params: Record<string, string | number | undefined>) {
  return unwrap(api.get<{ data: PageResult<CustomerDto> }>("/customers", { params }));
}

export function getCustomer(id: string) {
  return unwrap(api.get<{ data: CustomerDetail }>(`/customers/${id}`));
}

export function saveCustomer(id: string | null, body: unknown) {
  return unwrap(id ? api.patch<{ data: CustomerDto }>(`/customers/${id}`, body) : api.post<{ data: CustomerDto }>("/customers", body));
}

export function deleteCustomer(id: string) {
  return unwrap(api.delete<{ data: { id: string } }>(`/customers/${id}`));
}

export function deleteCustomers(ids: string[]) {
  return unwrap(api.post<{ data: { deleted: number; blocked: number } }>("/customers/bulk-delete", { ids }));
}
