import { createHash, randomBytes } from "node:crypto";

export function sessionCookieName() {
  return process.env.SESSION_COOKIE_NAME?.trim() || "shop_session";
}

export function sessionTtlSeconds() {
  const days = Number(process.env.SESSION_TTL_DAYS ?? 7);
  const safeDays = Number.isFinite(days) && days > 0 && days <= 90 ? days : 7;
  return Math.round(safeDays * 24 * 60 * 60);
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: sessionTtlSeconds(),
  };
}
