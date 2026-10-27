import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { sessionCookieName } from "@/server/auth/cookie";
import { getSessionFromToken } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(sessionCookieName())?.value;
  const session = await getSessionFromToken(token);
  if (!session) redirect("/login");
  return <AppShell user={session.user}>{children}</AppShell>;
}
