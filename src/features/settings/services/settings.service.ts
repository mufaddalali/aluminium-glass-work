import { api, unwrap } from "@/lib/axios";
import type { SettingsDto } from "@/lib/types";

export function getSettings() {
  return unwrap(api.get<{ data: SettingsDto }>("/settings"));
}

export function updateSettings(body: unknown) {
  return unwrap(api.patch<{ data: SettingsDto }>("/settings", body));
}

export function uploadLogo(file: File) {
  const form = new FormData();
  form.append("logo", file);
  return unwrap(api.post<{ data: { uploaded: boolean } }>("/settings/logo", form));
}
