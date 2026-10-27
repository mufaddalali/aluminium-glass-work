"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, LayoutDashboard, Package, Settings, Users, Wallet, ArrowLeftRight, X } from "lucide-react";
import { messages } from "@/constants/messages";
import { cn } from "@/lib/cn";
import { useShellStore } from "@/components/layout/shell-store";

const links = [
  { href: "/dashboard", label: messages.nav.dashboard, icon: LayoutDashboard },
  { href: "/inventory", label: messages.nav.inventory, icon: Package },
  { href: "/stock-movements", label: messages.nav.movements, icon: ArrowLeftRight },
  { href: "/customers", label: messages.nav.customers, icon: Users },
  { href: "/invoices", label: messages.nav.invoices, icon: FileText },
  { href: "/payments", label: messages.nav.payments, icon: Wallet },
  { href: "/reports", label: messages.nav.reports, icon: BarChart3 },
  { href: "/settings", label: messages.nav.settings, icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const open = useShellStore((state) => state.open);
  const setOpen = useShellStore((state) => state.setOpen);
  return (
    <>
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-60 flex-col border-e border-border bg-card lg:flex">
        <Brand />
        <Nav pathname={pathname} onNavigate={() => undefined} />
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-foreground/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-card">
            <div className="flex items-center justify-between pe-3">
              <Brand />
              <button className="rounded-md p-2 hover:bg-muted" aria-label="Close menu" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <Nav pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

function Brand() {
  return (
    <div className="px-5 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">{messages.appName}</p>
      <p className="mt-1 text-sm text-muted-foreground">Aluminum and glass</p>
    </div>
  );
}

function Nav({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 pb-6">
      {links.map((link) => {
        const active = link.href === "/dashboard" ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <Link key={link.href} href={link.href} onClick={onNavigate} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm", active ? "bg-secondary font-medium text-secondary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")} aria-current={active ? "page" : undefined}>
            <span className={cn("h-4 w-0.5 rounded-sm", active ? "bg-primary" : "bg-transparent")} />
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
