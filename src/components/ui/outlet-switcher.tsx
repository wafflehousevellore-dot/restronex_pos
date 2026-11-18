"use client";

import * as React from "react";
import { Store, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OutletItem {
  id: string;
  name: string;
  code?: string;
  address?: string;
  status?: string;
}

export interface OutletSwitcherProps {
  outlets?: OutletItem[];
  currentOutletId?: string | null;
  onSelectOutlet?: (outletId: string) => void;
  className?: string;
}

export function OutletSwitcher({
  outlets = [],
  currentOutletId,
  onSelectOutlet,
  className,
}: OutletSwitcherProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const activeOutlet =
    outlets.find((o) => o.id === currentOutletId) || outlets[0] || null;

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (outlet: OutletItem) => {
    setIsOpen(false);
    if (onSelectOutlet) {
      onSelectOutlet(outlet.id);
    } else {
      // Default: set cookie and refresh
      document.cookie = `restronex_outlet=${outlet.id}; path=/; max-age=2592000`;
      window.location.reload();
    }
  };

  if (!outlets || outlets.length === 0) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3 py-1.5 text-xs font-semibold text-[#172B25]",
          className
        )}
      >
        <Store className="h-3.5 w-3.5 text-[#16845B]" />
        <span>Main Outlet</span>
      </div>
    );
  }

  return (
    <div className={cn("relative inline-block text-left", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between gap-2 rounded-xl border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] px-3 py-1.5 text-xs font-semibold text-[#172B25] shadow-2xs hover:border-[#16845B]/40 transition min-w-[140px] max-w-[220px]"
      >
        <div className="flex items-center gap-1.5 truncate">
          <Store className="h-3.5 w-3.5 text-[#16845B] shrink-0" />
          <span className="truncate">{activeOutlet?.name || "Select Outlet"}</span>
        </div>
        <ChevronDown className="h-3 w-3 text-[#718078] shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-56 rounded-2xl border border-[#E5EBE7] bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#718078] border-b border-[#E5EBE7]/60 mb-1">
            Restaurant Outlets ({outlets.length})
          </div>

          <div className="max-h-60 overflow-y-auto scrollbar-thin space-y-0.5">
            {outlets.map((outlet) => {
              const isSelected = outlet.id === activeOutlet?.id;

              return (
                <button
                  key={outlet.id}
                  type="button"
                  onClick={() => handleSelect(outlet)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition text-left",
                    isSelected
                      ? "bg-[#E8F5EE] text-[#16845B] font-bold"
                      : "text-[#172B25] hover:bg-[#F8FAF9]"
                  )}
                >
                  <div className="truncate pr-2">
                    <div className="truncate">{outlet.name}</div>
                    {outlet.code && (
                      <div className="text-[10px] text-[#718078]">{outlet.code}</div>
                    )}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-[#16845B] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
