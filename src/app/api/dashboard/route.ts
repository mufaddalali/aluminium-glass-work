import { requireSession } from "@/server/auth/session";
import { ok, withApi } from "@/server/http/response";
import { getDashboard } from "@/server/services/dashboard.service";

export const GET = withApi(async () => {
  await requireSession();
  return ok(await getDashboard());
});
