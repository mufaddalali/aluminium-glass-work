import { mutationSession } from "@/server/http/guard";
import { ok, withApi } from "@/server/http/response";
import { archiveCustomer } from "@/server/services/customer.service";

type Context = { params: Promise<{ id: string }> };

export const POST = withApi<Context>(async (request, context) => {
  await mutationSession(request);
  const { id } = await context.params;
  return ok(await archiveCustomer(id));
});
