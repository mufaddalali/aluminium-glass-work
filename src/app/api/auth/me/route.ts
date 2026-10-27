import { requireSession } from "@/server/auth/session";
import { ok, withApi } from "@/server/http/response";

export const GET = withApi(async () => {
  const session = await requireSession();
  return ok({ user: session.user });
});
