import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control = "control-glass w-full rounded-2xl px-3.5 text-sm text-foreground transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type={type} className={cn("flex h-11 min-w-0 py-2.5", type === "date" && "block w-full max-w-full", control, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-28 py-3", control, className)} {...props} />;
}
