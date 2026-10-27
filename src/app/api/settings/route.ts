import { settingsSchema } from "@/features/settings/schemas/settings.schema";
import { requireSession } from "@/server/auth/session";
import { mutationOwner } from "@/server/http/guard";
import { ok, readJson, withApi } from "@/server/http/response";
import { getSettings, updateSettings } from "@/server/services/settings.service";

export const GET = withApi(async () => {
  await requireSession();
  return ok(await getSettings());
});

export const PATCH = withApi(async (request: Request) => {
  await mutationOwner(request);
  const input = settingsSchema.parse(await readJson(request));
  return ok(await updateSettings({
    ...input,
    address: input.address ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    defaultTerms: input.defaultTerms ?? null,
    defaultNotes: input.defaultNotes ?? null,
    paymentTermDays: input.paymentTermDays ?? null,
  }));
});
