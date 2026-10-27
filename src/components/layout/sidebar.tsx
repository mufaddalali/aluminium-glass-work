"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, FileText, LayoutDashboard, Package, PanelLeftClose, PanelLeftOpen, Settings, Users, Wallet, ArrowLeftRight, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { messages } from "@/constants/messages";
import { cn } from "@/lib/cn";
import { useShellStore } from "@/components/layout/shell-store";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const primary = [
  { href: "/dashboard", label: messages.nav.dashboard, icon: LayoutDashboard },
  { href: "/inventory", label: messages.nav.inventory, icon: Package },
  { href: "/stock-movements", label: messages.nav.movements, icon: ArrowLeftRight },
  { href: "/customers", label: messages.nav.customers, icon: Users },
  { href: "/invoices", label: messages.nav.invoices, icon: FileText },
  { href: "/payments", label: messages.nav.payments, icon: Wallet },
  { href: "/reports", label: messages.nav.reports, icon: BarChart3 },
];

const secondary = [{ href: "/settings", label: messages.nav.settings, icon: Settings }];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={cn("sidebar-surface flex h-full shrink-0 flex-col overflow-y-auto border-r bg-white/55 py-6 shadow-lg", collapsed ? "w-18 px-2" : "w-60 px-2.5")}>
      <div className={cn("mb-2 flex items-center", collapsed ? "flex-col gap-2.5" : "justify-between gap-2 px-1")}>
        <Link href="/dashboard" className={cn("truncate text-sm font-semibold tracking-tight", collapsed && "sr-only")}>
        <Image src="/logo.png" alt="Logo" width={100} height={100} className="w-8" />
        </Link>
        <Button type="button" variant="ghost" size="icon" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)} className="h-8 w-8 shrink-0">
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
      <nav aria-label="Primary" className="mt-4 flex flex-1 flex-col gap-1">
        {primary.map((item) => <NavLink key={item.href} {...item} pathname={pathname} collapsed={collapsed} />)}
      </nav>
      <nav aria-label="Secondary" className="mt-3 flex flex-col gap-0.5 border-t border-border/60 pt-3">
        {secondary.map((item) => <NavLink key={item.href} {...item} pathname={pathname} collapsed={collapsed} />)}
      </nav>
    </aside>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const open = useShellStore((state) => state.open);
  const setOpen = useShellStore((state) => state.setOpen);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <button className="absolute inset-0 bg-black/45 backdrop-blur-sm" aria-label="Close menu" onClick={() => setOpen(false)} />
      <aside className="sidebar-surface relative flex h-full w-72 flex-col border-r bg-white/80 py-6 shadow-lg">
        <div className="mb-5 flex items-center justify-between px-4">
          <p className="text-sm font-semibold tracking-tight">{messages.appName}</p>
          <button className="rounded-lg p-2 hover:bg-white/70" aria-label="Close menu" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2.5">
          {[...primary, ...secondary].map((item) => <NavLink key={item.href} {...item} pathname={pathname} collapsed={false} onNavigate={() => setOpen(false)} />)}
        </nav>
      </aside>
    </div>
  );
}

function NavLink({ href, label, icon: Icon, pathname, collapsed, onNavigate }: { href: string; label: string; icon: LucideIcon; pathname: string; collapsed: boolean; onNavigate?: () => void }) {
  const active = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} title={collapsed ? label : undefined} className={cn("group relative flex items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200", collapsed && "justify-center px-0", active ? "bg-linear-to-r from-primary to-accent text-primary-foreground shadow-primary" : "text-muted-foreground hover:bg-white/70 hover:text-foreground hover:shadow-sm dark:hover:bg-card/70")}>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-current" : "text-muted-foreground group-hover:text-foreground")} aria-hidden />
      <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
    </Link>
  );
}
