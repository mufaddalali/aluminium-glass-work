"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export type SearchOption = { id: string; label: string; detail?: string };

export function SearchSelect({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
  loading = false,
  options,
  onSelect,
  emptyText = "No matches",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  loading?: boolean;
  options?: SearchOption[];
  onSelect?: (option: SearchOption) => void;
  emptyText?: string;
}) {
  const autoId = useId();
  const listId = `${id ?? autoId}-results`;
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const showList = Boolean(onSelect) && open && value.trim().length > 0;

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  useEffect(() => {
    if (!showList) return;
    function place() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setBox({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [showList, value, loading, options]);

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete={onSelect ? "list" : undefined}
        role={onSelect ? "combobox" : undefined}
        className="w-full pe-10 text-black"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      />
      {loading ? <Loader2 className="pointer-events-none absolute inset-e-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-foreground motion-reduce:animate-none" aria-label="Searching" /> : null}
      {showList && box ? createPortal(
        <div
          ref={menuRef}
          id={listId}
          role="listbox"
          className="surface-card max-h-64 overflow-y-auto p-1.5"
          style={{ position: "fixed", top: box.top, left: box.left, width: box.width, zIndex: 80 }}
        >
          {loading ? <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p> : null}
          {!loading && (options?.length ?? 0) === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</p> : null}
          {!loading ? options?.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              className={cn("block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted cursor-pointer dark:hover:bg-white/8")}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSelect?.(option);
                setOpen(false);
              }}
            >
              <span className="font-medium">{option.label}</span>
              {option.detail ? <span className="mt-0.5 block text-xs text-muted-foreground">{option.detail}</span> : null}
            </button>
          )) : null}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
