import { invoiceListSchema, invoiceSchema } from "@/features/invoices/schemas/invoice.schema";
import { requireSession } from "@/server/auth/session";
import { mutationSession } from "@/server/http/guard";
import { ok, readJson, searchParams, withApi } from "@/server/http/response";
import { createInvoice, listInvoices } from "@/server/services/invoice.service";
import { parseDateOnly } from "@/server/utils/paging";

export const GET = withApi(async (request: Request) => {
  await requireSession();
  const query = invoiceListSchema.parse(searchParams(request));
  return ok(await listInvoices({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    status: query.status || undefined,
    customerId: query.customerId || undefined,
    from: query.from ? parseDateOnly(query.from) : undefined,
    to: query.to ? parseDateOnly(query.to) : undefined,
  }));
});

export const POST = withApi(async (request: Request) => {
  const session = await mutationSession(request);
  const input = invoiceSchema.parse(await readJson(request));
  return ok(await createInvoice(toInput(input), session.user.id), 201);
});

function toInput(input: ReturnType<typeof invoiceSchema.parse>) {
  return {
    customerId: input.customerId,
    invoiceDate: parseDateOnly(input.invoiceDate),
    dueDate: input.dueDate ? parseDateOnly(input.dueDate) : null,
    discountAmount: input.discountAmount ?? null,
    notes: input.notes ?? null,
    terms: input.terms ?? null,
    lines: input.lines.map((line) => ({
      ...line,
      productId: line.productId ?? null,
      itemName: line.itemName ?? null,
      description: line.description ?? null,
      unit: line.unit ?? null,
      width: line.width ?? null,
      height: line.height ?? null,
      dimensionUnit: line.dimensionUnit ?? null,
      pieceCount: line.pieceCount ?? null,
      discountAmount: line.discountAmount ?? null,
      purchaseCost: line.purchaseCost ?? null,
      supplierName: line.supplierName ?? null,
      supplierReference: line.supplierReference ?? null,
      purchaseNotes: line.purchaseNotes ?? null,
    })),
  };
}
