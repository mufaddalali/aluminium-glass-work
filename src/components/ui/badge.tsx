import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva("inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset", {
  variants: {
    tone: {
      default: "bg-white/55 text-muted-foreground ring-white/40 backdrop-blur-sm dark:bg-white/8 dark:ring-white/12",
      success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
      warning: "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300",
      info: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300",
      destructive: "bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300",
      muted: "bg-white/55 text-muted-foreground ring-white/40 dark:bg-white/8 dark:ring-white/12",
      outline: "bg-transparent text-foreground ring-border",
    },
  },
  defaultVariants: { tone: "default" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const statusTone = {
  DRAFT: "muted",
  ISSUED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  VOID: "destructive",
  OUT: "destructive",
  LOW: "warning",
  OK: "success",
  IN: "success",
  STOCK: "info",
  OUTSIDE_PURCHASE: "warning",
  ARCHIVED: "muted",
} as const;

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone[status as keyof typeof statusTone] ?? "outline";
  return <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>;
}
