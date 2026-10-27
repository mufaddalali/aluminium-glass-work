import { cn } from "@/lib/cn";

export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("surface-card overflow-x-auto", className)}>{children}</div>;
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="sticky top-0 bg-muted/70 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">{children}</thead>;
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>;
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("border-t border-border px-4 py-3 align-middle", className)}>{children}</td>;
}

export function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="hover:bg-muted/40">{children}</tr>;
}
