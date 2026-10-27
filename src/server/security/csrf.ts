import { ApiError } from "@/server/errors/api-error";

export function assertCsrf(request: Request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  if (request.headers.get("x-shop-request") !== "1") {
    throw new ApiError(403, "CSRF", "The request could not be verified.");
  }
  const origin = request.headers.get("origin");
  if (!origin) return;
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "CSRF", "The request could not be verified.");
  }
  if (originHost !== new URL(request.url).host) {
    throw new ApiError(403, "CSRF", "The request could not be verified.");
  }
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || "unknown";
}
