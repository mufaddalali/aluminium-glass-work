import { paymentListSchema, paymentSchema } from "@/features/payments/schemas/payment.schema";
import { requireSession } from "@/server/auth/session";
import { mutationSession } from "@/server/http/guard";
import { ok, readJson, searchParams, withApi } from "@/server/http/response";
import { listPayments, recordInvoicePayment } from "@/server/services/invoice.service";
import { endOfDateOnly, parseDateOnly } from "@/server/utils/paging";

export const GET = withApi(async (request: Request) => {
  await requireSession();
  const query = paymentListSchema.parse(searchParams(request));
  return ok(await listPayments({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    from: query.from ? parseDateOnly(query.from) : undefined,
    to: query.to ? endOfDateOnly(query.to) : undefined,
    kind: query.kind === "PAYMENT" || query.kind === "REFUND" ? query.kind : undefined,
  }));
});

export const POST = withApi(async (request: Request) => {
  const session = await mutationSession(request);
  const input = paymentSchema.parse(await readJson(request));
  const result = await recordInvoicePayment(
    {
      invoiceId: input.invoiceId,
      kind: input.kind,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      paymentDate: parseDateOnly(input.paymentDate),
      reference: input.reference,
      notes: input.notes,
      idempotencyKey: input.idempotencyKey,
    },
    session.user.id,
  );
  return ok(result, 201);
});
