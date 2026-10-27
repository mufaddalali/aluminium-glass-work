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
    categoryId: query.categoryId || undefined,
    active: query.active === "true" ? true : query.active === "false" ? false : undefined,
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
      ...input,
      sku: input.sku ?? null,
      description: input.description ?? null,
      brand: input.brand ?? null,
      colour: input.colour ?? null,
      thickness: input.thickness ?? null,
      defaultCostPrice: input.defaultCostPrice ?? null,
      openingQuantity: input.openingQuantity ?? null,
    },
    session.user.id,
  );
  return ok(product, 201);
});
