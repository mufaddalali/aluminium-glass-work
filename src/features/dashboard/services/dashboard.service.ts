import { api, unwrap } from "@/lib/axios";
import type { DashboardDto } from "@/lib/types";

export function getDashboard() {
  return unwrap(api.get<{ data: DashboardDto }>("/dashboard"));
}
