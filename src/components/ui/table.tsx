import { cn } from "@/lib/cn";

export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("surface-card overflow-x-auto", className)}>{children}</div>;
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full min-w-[720px] caption-bottom text-sm">{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="sticky top-0 z-10 bg-white/50 text-left backdrop-blur-md dark:bg-card/60 [&_tr]:border-b [&_tr]:border-white/30 dark:[&_tr]:border-white/10">{children}</thead>;
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("h-12 px-4 text-start align-middle text-xs font-semibold tracking-wide text-muted-foreground", className)}>{children}</th>;
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-white/30 px-4 py-3.5 align-middle dark:border-white/10", className)}>{children}</td>;
}

export function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="transition-colors duration-150 hover:bg-muted-foreground/5 dark:hover:bg-white/5">{children}</tr>;
}
