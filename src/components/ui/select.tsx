"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export function Select({ value, onValueChange, placeholder, options, id, disabled }: {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <SelectPrimitive.Root value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger id={id} className="control-glass flex h-11 w-full items-center justify-between rounded-2xl px-3.5 text-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50">
        <SelectPrimitive.Value placeholder={placeholder ?? "Select"} />
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="z-50 overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-lg backdrop-blur-xl dark:border-white/12 dark:bg-card/75">
          <SelectPrimitive.Viewport className="max-h-72 p-1.5">
            {options.map((option) => (
              <SelectPrimitive.Item key={option.value} value={option.value} className={cn("flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm outline-none focus:bg-muted")}>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator><Check className="h-4 w-4" /></SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
