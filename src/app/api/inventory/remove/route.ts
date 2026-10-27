import { removeStockSchema } from "@/features/inventory/schemas/product.schema";
import { mutationSession } from "@/server/http/guard";
import { ok, readJson, withApi } from "@/server/http/response";
import { parseDateOnly } from "@/server/utils/paging";
import { removeStock } from "@/server/services/inventory.service";

export const POST = withApi(async (request: Request) => {
  const session = await mutationSession(request);
  const input = removeStockSchema.parse(await readJson(request));
  const product = await removeStock(
    {
      productId: input.productId,
      quantity: input.quantity,
      occurredAt: parseDateOnly(input.occurredAt),
      reason: input.reason,
      movementType: input.movementType,
    },
    session.user.id,
  );
  return ok(product);
});
