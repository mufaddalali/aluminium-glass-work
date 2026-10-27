import { movementListSchema } from "@/features/inventory/schemas/product.schema";
import { toCsv } from "@/lib/csv";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { UNIT_LABELS } from "@/lib/glass";
import { requireSession } from "@/server/auth/session";
import { csvResponse, ok, searchParams, withApi } from "@/server/http/response";
import { listMovements } from "@/server/services/inventory.service";
import { ensureSettings } from "@/server/services/settings.service";
import { endOfDateOnly, parseDateOnly } from "@/server/utils/paging";

export const GET = withApi(async (request: Request) => {
  await requireSession();
  const query = movementListSchema.parse(searchParams(request));
  const settings = await ensureSettings();
  const data = await listMovements({
    page: query.export === "csv" ? 1 : query.page,
    pageSize: query.export === "csv" ? 5000 : query.pageSize,
    search: query.search || undefined,
    productId: query.productId || undefined,
    direction: query.direction === "IN" || query.direction === "OUT" ? query.direction : undefined,
    from: query.from ? parseDateOnly(query.from) : undefined,
    to: query.to ? endOfDateOnly(query.to) : undefined,
  });
  if (query.export === "csv") {
    const body = toCsv(
      ["Date", "Product", "Type", "Direction", "Quantity", "Unit", "Before", "After", "Reason", "Invoice", "User"],
      data.items.map((item) => [
        formatDateTime(item.occurredAt, settings.timeZone),
        item.productName,
        item.movementType,
        item.direction,
        formatQuantity(item.quantity),
        UNIT_LABELS[item.unit],
        item.stockBefore ? formatQuantity(item.stockBefore) : "",
        item.stockAfter ? formatQuantity(item.stockAfter) : "",
        item.reason,
        item.invoiceNumber ?? "",
        item.createdByName,
      ]),
    );
    return csvResponse("stock-movements.csv", body);
  }
  return ok(data);
});
