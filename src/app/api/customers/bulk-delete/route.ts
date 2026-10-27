import { deleteCustomersSchema } from "@/features/customers/schemas/customer.schema";
import { mutationSession } from "@/server/http/guard";
import { ok, readJson, withApi } from "@/server/http/response";
import { deleteCustomers } from "@/server/services/customer.service";

export const POST = withApi(async (request: Request) => {
  await mutationSession(request);
  const input = deleteCustomersSchema.parse(await readJson(request));
  return ok(await deleteCustomers(input.ids));
});
