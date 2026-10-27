import { invoiceSchema } from "@/features/invoices/schemas/invoice.schema";
import { requireSession } from "@/server/auth/session";
import { mutationSession } from "@/server/http/guard";
import { ok, readJson, withApi } from "@/server/http/response";
import { deleteDraft, getInvoice, updateInvoice } from "@/server/services/invoice.service";
import { parseDateOnly } from "@/server/utils/paging";

type Context = { params: Promise<{ id: string }> };

export const GET = withApi<Context>(async (_request, context) => {
  await requireSession();
  const { id } = await context.params;
  return ok(await getInvoice(id));
});

export const PATCH = withApi<Context>(async (request, context) => {
  await mutationSession(request);
  const { id } = await context.params;
  const input = invoiceSchema.parse(await readJson(request));
  return ok(await updateInvoice(id, {
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
  }));
});

export const DELETE = withApi<Context>(async (request, context) => {
  await mutationSession(request);
  const { id } = await context.params;
  await deleteDraft(id);
  return ok({ deleted: true });
});
