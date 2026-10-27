import { categorySchema } from "@/features/inventory/schemas/product.schema";
import { mutationSession } from "@/server/http/guard";
import { ok, readJson, withApi } from "@/server/http/response";
import { requireSession } from "@/server/auth/session";
import { createCategory, listCategories } from "@/server/services/inventory.service";

export const GET = withApi(async () => {
  await requireSession();
  const categories = await listCategories();
  return ok(categories.map((category) => ({ id: category.id, name: category.name, isActive: category.isActive })));
});

export const POST = withApi(async (request: Request) => {
  await mutationSession(request);
  const input = categorySchema.parse(await readJson(request));
  const category = await createCategory(input.name);
  return ok({ id: category.id, name: category.name, isActive: category.isActive }, 201);
});
