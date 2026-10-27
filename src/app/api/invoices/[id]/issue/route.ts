import { mutationSession } from "@/server/http/guard";
import { ok, withApi } from "@/server/http/response";
import { issueInvoice } from "@/server/services/invoice.service";

type Context = { params: Promise<{ id: string }> };

export const POST = withApi<Context>(async (request, context) => {
  const session = await mutationSession(request);
  const { id } = await context.params;
  return ok(await issueInvoice(id, session.user.id));
});
