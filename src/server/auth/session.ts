import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { ApiError } from "@/server/errors/api-error";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSessionToken, hashSessionToken, sessionCookieName, sessionTtlSeconds } from "@/server/auth/cookie";
import { assertLoginAllowed, recordLoginAttempt } from "@/server/security/rate-limit";
import type { PublicUser } from "@/lib/types";

let dummyHash: Promise<string> | null = null;

function placeholderHash() {
  dummyHash ??= hashPassword("placeholder-password-not-used");
  return dummyHash;
}

export function toPublicUser(user: Pick<User, "id" | "name" | "email" | "role">): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function loginWithPassword(input: { email: string; password: string; ip: string; userAgent: string | null }) {
  const email = input.email.trim().toLowerCase();
  await assertLoginAllowed(email, input.ip);
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = user ? await verifyPassword(user.passwordHash, input.password) : await verifyPassword(await placeholderHash(), input.password).then(() => false);
  const allowed = Boolean(user && user.isActive && passwordOk);
  await recordLoginAttempt({ emailKey: email, ipAddress: input.ip, success: allowed });
  if (!allowed || !user) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "The email or password is incorrect.");
  }
  const token = createSessionToken();
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + sessionTtlSeconds() * 1000),
      userAgent: input.userAgent,
    },
  });
  return { token, user: toPublicUser(user) };
}

export async function getSessionFromToken(token: string | undefined | null) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
    return null;
  }
  await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
  return { sessionId: session.id, user: toPublicUser(session.user) };
}

export async function requireSession() {
  const token = (await cookies()).get(sessionCookieName())?.value;
  const session = await getSessionFromToken(token);
  if (!session) throw new ApiError(401, "UNAUTHENTICATED", "Sign in required.");
  return session;
}

export async function requireOwner() {
  const session = await requireSession();
  if (session.user.role !== "OWNER") {
    throw new ApiError(403, "FORBIDDEN", "Only the owner can change these settings.");
  }
  return session;
}

export async function revokeSessionToken(token: string | undefined | null) {
  if (!token) return;
  await prisma.session.updateMany({
    where: { tokenHash: hashSessionToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
