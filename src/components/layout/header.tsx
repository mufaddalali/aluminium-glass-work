"use client";

import { LogOut, Menu, Moon, Settings, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { messages } from "@/constants/messages";
import { api } from "@/lib/axios";
import { useShellStore } from "@/components/layout/shell-store";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { PublicUser } from "@/lib/types";

export function Header({ user }: { user: PublicUser }) {
  const setOpen = useShellStore((state) => state.setOpen);
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function logout() {
    await api.post("/auth/logout");
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="glass-surface sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/40 px-4 shadow-lg backdrop-blur-2xl sm:px-7 dark:border-white/5">
      <div className="flex min-w-0 items-center gap-3">
        <Button type="button" variant="ghost" size="icon" aria-label="Open menu" className="sm:hidden" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <p className="truncate text-sm font-semibold tracking-tight">{messages.appName}</p>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button type="button" variant="ghost" size="icon" aria-label="Toggle color theme" className="hidden sm:inline-flex" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          <Sun className="hidden h-4 w-4 dark:block" />
          <Moon className="h-4 w-4 dark:hidden" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Account menu" className="cursor-pointer rounded-full border border-primary/10 p-0.5 transition-colors duration-200 hover:border-primary">
              <Avatar name={user.name} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>
              <span className="block font-medium text-foreground">{user.name}</span>
              <span className="block text-xs font-normal text-muted-foreground">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings"><Settings className="h-4 w-4" />{messages.nav.settings}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={(event) => { event.preventDefault(); void logout(); }}>
              <LogOut className="h-4 w-4" />{messages.nav.logout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
