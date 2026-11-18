"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string;
  onChange?: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  debounceMs?: number;
  shortcutHint?: string;
  onClear?: () => void;
}

export function SearchInput({
  value: controlledValue,
  defaultValue = "",
  onChange,
  onDebouncedChange,
  debounceMs = 300,
  shortcutHint,
  onClear,
  className,
  placeholder = "Search...",
  ...props
}: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState<string>(
    controlledValue !== undefined ? String(controlledValue) : String(defaultValue)
  );

  React.useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(String(controlledValue));
    }
  }, [controlledValue]);

  // Debounced callback
  React.useEffect(() => {
    if (!onDebouncedChange) return;
    const handler = setTimeout(() => {
      onDebouncedChange(internalValue);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [internalValue, onDebouncedChange, debounceMs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setInternalValue(next);
    onChange?.(next);
  };

  const handleClear = () => {
    setInternalValue("");
    onChange?.("");
    onDebouncedChange?.("");
    onClear?.();
  };

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <Search className="absolute left-3.5 h-4 w-4 text-[#718078] pointer-events-none shrink-0" />
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "h-10 w-full rounded-xl border border-[#E5EBE7] bg-white pl-9.5 pr-8 text-sm text-[#172B25] placeholder-[#A0ACA5] shadow-2xs transition-all",
          "focus:outline-none focus:border-[#16845B] focus:ring-2 focus:ring-[#16845B]/20",
          "disabled:cursor-not-allowed disabled:bg-[#F8FAF9] disabled:opacity-60",
          shortcutHint && "pr-16"
        )}
        {...props}
      />

      {internalValue ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 p-1 rounded-md text-[#718078] hover:text-[#172B25] hover:bg-[#F0F4F2] transition-colors"
          title="Clear search"
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Clear</span>
        </button>
      ) : shortcutHint ? (
        <kbd className="absolute right-2.5 hidden sm:inline-flex items-center gap-0.5 rounded border border-[#E5EBE7] bg-[#F8FAF9] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#718078] pointer-events-none">
          {shortcutHint}
        </kbd>
      ) : null}
    </div>
  );
}
