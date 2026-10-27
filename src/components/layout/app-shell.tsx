"use client";

import type { ReactNode } from "react";
import type { PublicUser } from "@/lib/types";
import { Header } from "@/components/layout/header";
import { MobileSidebar, Sidebar } from "@/components/layout/sidebar";

export function AppShell({ user, children }: { user: PublicUser; children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-linear-to-br from-(--background-from) via-(--background-via) to-(--background-to) text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -inset-x-5 top-4 h-80 bg-linear-to-br from-primary/25 via-accent/15 to-transparent blur-3xl" />
      </div>
      <div className="relative flex h-dvh overflow-hidden">
        <div className="hidden sm:block">
          <Sidebar />
        </div>
        <MobileSidebar />
        <div className="z-1 flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Header user={user} />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
