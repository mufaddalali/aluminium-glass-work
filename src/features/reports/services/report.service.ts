import { api, unwrap } from "@/lib/axios";
import type { ReportTable } from "@/lib/types";

export function getReport(type: string, params: Record<string, string | number | undefined>) {
  return unwrap(api.get<{ data: ReportTable }>(`/reports/${type}`, { params }));
}
