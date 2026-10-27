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
  await mutationSession(request);
  const { id } = await context.params;
  const input = productSchema.parse(await readJson(request));
  return ok(await updateProduct(id, {
    ...input,
    sku: input.sku ?? null,
    description: input.description ?? null,
    brand: input.brand ?? null,
    colour: input.colour ?? null,
    thickness: input.thickness ?? null,
    defaultCostPrice: input.defaultCostPrice ?? null,
  }));
});
