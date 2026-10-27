import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl text-sm font-medium whitespace-nowrap transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] motion-reduce:transition-colors motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-[var(--shadow-primary)] hover:bg-secondary-foreground hover:scale-[1.02] motion-reduce:hover:scale-100",
        secondary: "bg-secondary text-secondary-foreground shadow-[var(--shadow-sm)] hover:bg-secondary/80 hover:scale-[1.02] motion-reduce:hover:scale-100",
        outline: "control-glass text-foreground hover:bg-white/75 hover:scale-[1.02] dark:hover:bg-card/80 motion-reduce:hover:scale-100",
        ghost: "text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/8",
        destructive: "bg-destructive text-destructive-foreground shadow-[0_4px_14px_rgb(220_61_61_/_0.28)] hover:scale-[1.02] hover:brightness-110 motion-reduce:hover:scale-100",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean };

export function Button({ className, variant, size, asChild, loading, children, disabled, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild) return <Slot className={classes} {...props}>{children}</Slot>;
  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
      {children}
    </button>
  );
}
