import { cn } from "@/lib/cn";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-accent text-sm font-semibold text-primary-foreground shadow-xs ring-2 ring-background", className)}>
      {initials(name)}
    </span>
  );
}
