import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="surface-card flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 rounded-xl bg-secondary p-3 text-primary"><Icon className="h-5 w-5" /></div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="surface-card px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description ?? "The information could not be loaded."}</p>
      {onRetry ? <Button className="mt-5" variant="outline" onClick={onRetry}>Try again</Button> : null}
    </div>
  );
}
