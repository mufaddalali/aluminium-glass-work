import { productListSchema, productSchema } from "@/features/inventory/schemas/product.schema";
import { mutationSession } from "@/server/http/guard";
import { ok, readJson, searchParams, withApi } from "@/server/http/response";
import { requireSession } from "@/server/auth/session";
import { createProduct, listProducts } from "@/server/services/inventory.service";

export const GET = withApi(async (request: Request) => {
  await requireSession();
  const query = productListSchema.parse(searchParams(request));
  const data = await listProducts({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    stock: query.stock || undefined,
    sort: query.sort,
    dir: query.dir,
  });
  return ok(data);
});

export const POST = withApi(async (request: Request) => {
  const session = await mutationSession(request);
  const input = productSchema.parse(await readJson(request));
  const product = await createProduct(
    {
      name: input.name,
      description: input.description ?? null,
      quantity: input.quantity,
      defaultSellingPrice: input.defaultSellingPrice,
    },
    session.user.id,
  );
  return ok(product, 201);
});
