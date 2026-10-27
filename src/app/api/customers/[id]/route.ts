import { customerSchema } from "@/features/customers/schemas/customer.schema";
import { requireSession } from "@/server/auth/session";
import { mutationSession } from "@/server/http/guard";
import { ok, readJson, withApi } from "@/server/http/response";
import { getCustomer, updateCustomer } from "@/server/services/customer.service";

type Context = { params: Promise<{ id: string }> };

export const GET = withApi<Context>(async (_request, context) => {
  await requireSession();
  const { id } = await context.params;
  return ok(await getCustomer(id));
});

export const PATCH = withApi<Context>(async (request, context) => {
  await mutationSession(request);
  const { id } = await context.params;
  const input = customerSchema.parse(await readJson(request));
  return ok(await updateCustomer(id, input));
});
