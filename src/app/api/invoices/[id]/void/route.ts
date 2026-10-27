import { voidSchema } from "@/features/invoices/schemas/invoice.schema";
import { mutationSession } from "@/server/http/guard";
import { ok, readJson, withApi } from "@/server/http/response";
import { voidInvoice } from "@/server/services/invoice.service";

type Context = { params: Promise<{ id: string }> };

export const POST = withApi<Context>(async (request, context) => {
  const session = await mutationSession(request);
  const { id } = await context.params;
  const input = voidSchema.parse(await readJson(request));
  return ok(await voidInvoice(id, input.reason, session.user.id));
});
