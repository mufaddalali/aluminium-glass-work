import { cookies } from "next/headers";
import { sessionCookieName, sessionCookieOptions } from "@/server/auth/cookie";
import { revokeSessionToken } from "@/server/auth/session";
import { ok, withApi } from "@/server/http/response";
import { assertCsrf } from "@/server/security/csrf";

export const POST = withApi(async (request: Request) => {
  assertCsrf(request);
  const store = await cookies();
  const token = store.get(sessionCookieName())?.value;
  await revokeSessionToken(token);
  store.set(sessionCookieName(), "", { ...sessionCookieOptions(), maxAge: 0 });
  return ok({ signedOut: true });
});
