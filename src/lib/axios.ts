import axios from "axios";

export class ApiClientError extends Error {
  code?: string;
  status?: number;
  details?: unknown;
}

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "X-Shop-Request": "1" },
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const response = axios.isAxiosError(error) ? error.response : undefined;
    const body = response?.data as { error?: { message?: string; code?: string; details?: unknown } } | undefined;
    const wrapped = new ApiClientError(body?.error?.message || "Request failed.");
    wrapped.code = body?.error?.code;
    wrapped.status = response?.status;
    wrapped.details = body?.error?.details;
    if (wrapped.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the session cookie is gone, so the next request must be a full load
      window.location.assign("/login");
    }
    return Promise.reject(wrapped);
  },
);

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function unwrap<T>(request: Promise<{ data: { data: T } }>) {
  const response = await request;
  return response.data.data;
}
