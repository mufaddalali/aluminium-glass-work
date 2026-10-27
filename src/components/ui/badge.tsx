import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva("inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]", {
  variants: {
    tone: {
      default: "bg-secondary text-secondary-foreground",
      success: "bg-success/15 text-success",
      warning: "bg-warning/15 text-warning",
      info: "bg-info/15 text-info",
      destructive: "bg-destructive/15 text-destructive",
      muted: "bg-muted text-muted-foreground",
      outline: "border border-border text-foreground",
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
} as const;

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone[status as keyof typeof statusTone] ?? "outline";
  return <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>;
}
