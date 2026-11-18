"use client";

import * as React from "react";
import { RotateCcw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "./search-input";

export interface FilterToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  totalCount?: number;
  filteredCount?: number;
  onExport?: () => void;
  exportLabel?: string;
}

export function FilterToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search records...",
  filters,
  actions,
  onReset,
  hasActiveFilters = false,
  totalCount,
  filteredCount,
  onExport,
  exportLabel = "Export",
  className,
  children,
  ...props
}: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E5EBE7] bg-white p-3.5 shadow-2xs space-y-3 mb-4",
        className
      )}
      {...props}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Search & Custom Filters */}
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {onSearchChange !== undefined && (
            <div className="w-full sm:w-64 md:w-72">
              <SearchInput
                value={searchQuery}
                onDebouncedChange={onSearchChange}
                placeholder={searchPlaceholder}
              />
            </div>
          )}

          {filters}
          {children}

          {hasActiveFilters && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] hover:bg-[#E5EBE7] px-3 py-2 text-xs font-semibold text-[#718078] hover:text-[#172B25] transition"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Count, Export & Actions */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-[#E5EBE7]/60">
          {totalCount !== undefined && (
            <div className="text-xs text-[#718078] font-medium">
              Showing{" "}
              <span className="font-bold text-[#172B25]">
                {filteredCount !== undefined ? filteredCount : totalCount}
              </span>{" "}
              of <span className="font-bold text-[#172B25]">{totalCount}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] hover:border-[#16845B]/40 px-3.5 py-2 text-xs font-semibold text-[#172B25] shadow-2xs transition"
              >
                <Download className="h-3.5 w-3.5 text-[#718078]" />
                <span>{exportLabel}</span>
              </button>
            )}

            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
