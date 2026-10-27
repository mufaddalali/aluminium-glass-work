import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import { mutationOwner } from "@/server/http/guard";
import { ok, withApi } from "@/server/http/response";
import { ApiError } from "@/server/errors/api-error";
import { clearLogo, readLogo, saveLogo } from "@/server/services/settings.service";

export const GET = withApi(async () => {
  await requireSession();
  const logo = await readLogo();
  if (!logo) throw new ApiError(404, "NOT_FOUND", "No logo has been uploaded.");
  return new NextResponse(new Uint8Array(logo.bytes), {
    status: 200,
    headers: {
      "Content-Type": logo.mimeType,
      "Cache-Control": "private, max-age=60",
    },
  });
});

export const POST = withApi(async (request: Request) => {
  await mutationOwner(request);
  const form = await request.formData();
  const file = form.get("logo");
  if (!(file instanceof File)) throw new ApiError(400, "INVALID_LOGO", "Choose a logo file.");
  await saveLogo(Buffer.from(await file.arrayBuffer()), file.type);
  return ok({ uploaded: true });
});

export const DELETE = withApi(async (request: Request) => {
  await mutationOwner(request);
  await clearLogo();
  return ok({ removed: true });
});
