"use client";

import type { ReactNode } from "react";
import type { PublicUser } from "@/lib/types";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ user, children }: { user: PublicUser; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header user={user} />
      <main className="px-4 pb-12 pt-24 sm:px-6 lg:ps-64 lg:pe-8">
        <div className="mx-auto w-full max-w-7xl space-y-8">{children}</div>
      </main>
    </div>
  );
}
