import { cookies } from "next/headers";
import { loginSchema } from "@/features/auth/schemas/login.schema";
import { sessionCookieName, sessionCookieOptions } from "@/server/auth/cookie";
import { loginWithPassword } from "@/server/auth/session";
import { ok, readJson, withApi } from "@/server/http/response";
import { assertCsrf, clientIp } from "@/server/security/csrf";

export const POST = withApi(async (request: Request) => {
  assertCsrf(request);
  const input = loginSchema.parse(await readJson(request));
  const result = await loginWithPassword({
    email: input.email,
    password: input.password,
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent"),
  });
  const store = await cookies();
  store.set(sessionCookieName(), result.token, sessionCookieOptions());
  return ok({ user: result.user });
});
