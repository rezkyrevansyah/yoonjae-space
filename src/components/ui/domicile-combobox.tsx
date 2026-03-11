"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DomicileComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DomicileCombobox({ options, value, onChange, placeholder = "Pilih kota", disabled, className }: DomicileComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleOpen() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSelect(opt: string) {
    onChange(opt === value ? "" : opt);
    setOpen(false);
    setQuery("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground"
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && (
            <X
              className="h-3.5 w-3.5 opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </div>
      </button>

      {/* Dropdown — inline, no portal */}
      {open && (
        <div className="absolute z-[200] mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ketik nama kota..."
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada hasil.</p>
            ) : (
              <>
                {/* Clear option */}
                <button
                  type="button"
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  — Tidak ada —
                </button>
                {filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleSelect(opt)}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === opt ? "opacity-100" : "opacity-0")} />
                    {opt}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
