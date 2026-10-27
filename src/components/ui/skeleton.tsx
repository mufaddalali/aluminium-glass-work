import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton-shimmer h-4 rounded-md", className)} />;
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="surface-card space-y-3 p-4">
      {Array.from({ length: rows }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}
    </div>
  );
}
