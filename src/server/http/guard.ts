import { assertCsrf } from "@/server/security/csrf";
import { requireOwner, requireSession } from "@/server/auth/session";

export async function mutationSession(request: Request) {
  assertCsrf(request);
  return requireSession();
}

export async function mutationOwner(request: Request) {
  assertCsrf(request);
  return requireOwner();
}
