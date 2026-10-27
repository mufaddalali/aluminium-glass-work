import { productSchema } from "@/features/inventory/schemas/product.schema";
import { mutationSession } from "@/server/http/guard";
import { ok, readJson, withApi } from "@/server/http/response";
import { requireSession } from "@/server/auth/session";
import { getProduct, updateProduct } from "@/server/services/inventory.service";

type Context = { params: Promise<{ id: string }> };

export const GET = withApi<Context>(async (_request, context) => {
  await requireSession();
  const { id } = await context.params;
  return ok(await getProduct(id));
});

export const PATCH = withApi<Context>(async (request, context) => {
  const session = await mutationSession(request);
  const { id } = await context.params;
  const input = productSchema.parse(await readJson(request));
  return ok(await updateProduct(id, {
    name: input.name,
    description: input.description ?? null,
    quantity: input.quantity,
    defaultSellingPrice: input.defaultSellingPrice,
  }, session.user.id));
});
