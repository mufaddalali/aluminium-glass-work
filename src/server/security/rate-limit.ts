import { prisma } from "@/server/db/prisma";
import { ApiError } from "@/server/errors/api-error";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

export async function assertLoginAllowed(emailKey: string, ipAddress: string) {
  const since = new Date(Date.now() - WINDOW_MS);
  const failures = await prisma.loginAttempt.count({
    where: {
      success: false,
      attemptedAt: { gte: since },
      OR: [{ emailKey }, { ipAddress }],
    },
  });
  if (failures >= MAX_FAILURES) {
    throw new ApiError(429, "RATE_LIMITED", "Too many sign-in attempts. Try again later.");
  }
}

export function recordLoginAttempt(input: { emailKey: string; ipAddress: string; success: boolean }) {
  return prisma.loginAttempt.create({ data: input });
}
