import { receiveStockSchema } from "@/features/inventory/schemas/product.schema";
import { mutationSession } from "@/server/http/guard";
import { ok, readJson, withApi } from "@/server/http/response";
import { parseDateOnly } from "@/server/utils/paging";
import { receiveStock } from "@/server/services/inventory.service";

export const POST = withApi(async (request: Request) => {
  const session = await mutationSession(request);
  const input = receiveStockSchema.parse(await readJson(request));
  const product = await receiveStock(
    {
      productId: input.productId,
      quantity: input.quantity,
      occurredAt: parseDateOnly(input.occurredAt),
      costPrice: input.costPrice,
      supplierName: input.supplierName,
      supplierReference: input.supplierReference,
      reason: input.reason,
      movementType: input.movementType,
    },
    session.user.id,
  );
  return ok(product);
});
