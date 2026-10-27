import { cn } from "@/lib/cn";

export function MetricStrip({ items, className }: { items: Array<{ label: string; value: React.ReactNode }>; className?: string }) {
  const columns = items.length >= 4 ? "sm:grid-cols-4" : items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";
  return (
    <div className={cn("surface-card grid divide-y divide-border sm:divide-x sm:divide-y-0", columns, className)}>
      {items.map((item) => (
        <div key={item.label} className="px-5 py-5">
          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
          <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
