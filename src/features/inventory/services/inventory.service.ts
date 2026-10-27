import { api, unwrap } from "@/lib/axios";
import type { PageResult, ProductDto, MovementDto, SettingsDto } from "@/lib/types";

export function listProducts(params: Record<string, string | number | undefined>) {
  return unwrap(api.get<{ data: PageResult<ProductDto> }>("/products", { params }));
}

export function getProduct(id: string) {
  return unwrap(api.get<{ data: ProductDto }>(`/products/${id}`));
}

export function saveProduct(id: string | null, body: unknown) {
  return unwrap(id ? api.patch<{ data: ProductDto }>(`/products/${id}`, body) : api.post<{ data: ProductDto }>("/products", body));
}

export function receiveStock(body: unknown) {
  return unwrap(api.post<{ data: ProductDto }>("/inventory/receive", body));
}

export function removeStock(body: unknown) {
  return unwrap(api.post<{ data: ProductDto }>("/inventory/remove", body));
}

export function listMovements(params: Record<string, string | number | undefined>) {
  return unwrap(api.get<{ data: PageResult<MovementDto> }>("/stock-movements", { params }));
}

export function getShopSettings() {
  return unwrap(api.get<{ data: SettingsDto }>("/settings"));
}

export function movementsExportUrl(params: Record<string, string | undefined>) {
  const search = new URLSearchParams({ ...params, export: "csv" });
  return `/api/stock-movements?${search.toString()}`;
}
