import { customerListSchema, customerSchema } from "@/features/customers/schemas/customer.schema";
import { requireSession } from "@/server/auth/session";
import { mutationSession } from "@/server/http/guard";
import { ok, readJson, searchParams, withApi } from "@/server/http/response";
import { createCustomer, listCustomers } from "@/server/services/customer.service";

export const GET = withApi(async (request: Request) => {
  await requireSession();
  const query = customerListSchema.parse(searchParams(request));
  return ok(await listCustomers({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    active: query.active === "true" ? true : query.active === "false" ? false : undefined,
  }));
});

export const POST = withApi(async (request: Request) => {
  await mutationSession(request);
  const input = customerSchema.parse(await readJson(request));
  return ok(await createCustomer(input), 201);
});
