import { mutationSession } from "@/server/http/guard";
import { ok, withApi } from "@/server/http/response";
import { archiveProduct } from "@/server/services/inventory.service";

type Context = { params: Promise<{ id: string }> };

export const POST = withApi<Context>(async (request, context) => {
  await mutationSession(request);
  const { id } = await context.params;
  return ok(await archiveProduct(id));
});
