"use client";

import { LogOut, Menu, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { messages } from "@/constants/messages";
import { useShellStore } from "@/components/layout/shell-store";
import type { PublicUser } from "@/lib/types";

export function Header({ user }: { user: PublicUser }) {
  const setOpen = useShellStore((state) => state.setOpen);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  async function logout() {
    await api.post("/auth/logout");
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="surface-glass fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between px-4 lg:start-60">
      <button className="rounded-md p-2 hover:bg-muted lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
        <Menu className="h-4 w-4" />
      </button>
      <div className="hidden text-sm text-muted-foreground lg:block">Signed in as {user.name}</div>
      <div className="ms-auto flex items-center gap-2">
        <button className="rounded-md p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Toggle color theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          <Sun className="hidden h-4 w-4 dark:block" />
          <Moon className="h-4 w-4 dark:hidden" />
        </button>
        <button className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          {messages.nav.logout}
        </button>
      </div>
    </header>
  );
}
