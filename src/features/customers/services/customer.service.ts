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

export function archiveCustomer(id: string) {
  return unwrap(api.post<{ data: CustomerDto }>(`/customers/${id}/archive`));
}
