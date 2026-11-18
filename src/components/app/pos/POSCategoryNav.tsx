"use client";

import * as React from "react";
import { Search, Layers, Check, Circle, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategoryInfo {
  id: string;
  name: string;
  count: number;
}

export interface POSCategoryNavProps {
  categories: CategoryInfo[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  dietFilter: "ALL" | "VEG" | "NON_VEG";
  onDietFilterChange: (diet: "ALL" | "VEG" | "NON_VEG") => void;
  inStockOnly: boolean;
  onInStockOnlyChange: (inStock: boolean) => void;
  totalProductsCount: number;
  className?: string;
}

export function POSCategoryNav({
  categories,
  selectedCategory,
  onSelectCategory,
  dietFilter,
  onDietFilterChange,
  inStockOnly,
  onInStockOnlyChange,
  totalProductsCount,
  className,
}: POSCategoryNavProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white border border-[#E5EBE7] rounded-3xl p-3 shadow-2xs overflow-hidden",
        className
      )}
    >
      {/* Category Header */}
      <div className="pb-3 border-b border-[#E5EBE7] space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#172B25] uppercase tracking-wider">
            <Layers className="h-4 w-4 text-[#16845B]" />
            <span>Categories</span>
          </div>
          <span className="text-[10px] font-bold bg-[#E8F5EE] text-[#16845B] px-2 py-0.5 rounded-full">
            {categories.length}
          </span>
        </div>

        {/* Category Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#718078]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search category..."
            className="w-full h-8 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] pl-8 pr-2.5 text-xs text-[#172B25] placeholder-[#A0ACA5] focus:outline-none focus:border-[#16845B] transition"
          />
        </div>

        {/* Diet Quick Filter: All / Veg / Non-Veg */}
        <div className="grid grid-cols-3 gap-1 bg-[#F8FAF9] p-1 rounded-xl border border-[#E5EBE7]">
          <button
            type="button"
            onClick={() => onDietFilterChange("ALL")}
            className={cn(
              "py-1 text-[11px] font-bold rounded-lg transition text-center",
              dietFilter === "ALL"
                ? "bg-white text-[#172B25] shadow-2xs"
                : "text-[#718078] hover:text-[#172B25]"
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onDietFilterChange("VEG")}
            className={cn(
              "py-1 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1",
              dietFilter === "VEG"
                ? "bg-white text-emerald-700 shadow-2xs border border-emerald-200"
                : "text-[#718078] hover:text-emerald-700"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" />
            <span>Veg</span>
          </button>
          <button
            type="button"
            onClick={() => onDietFilterChange("NON_VEG")}
            className={cn(
              "py-1 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1",
              dietFilter === "NON_VEG"
                ? "bg-white text-red-700 shadow-2xs border border-red-200"
                : "text-[#718078] hover:text-red-700"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-red-600 inline-block" />
            <span>Non-Veg</span>
          </button>
        </div>
      </div>

      {/* Category List */}
      <div className="flex-1 overflow-y-auto py-2.5 space-y-1 scrollbar-thin">
        {/* All Products Option */}
        <button
          type="button"
          onClick={() => onSelectCategory("All")}
          className={cn(
            "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition text-left",
            selectedCategory === "All"
              ? "bg-[#16845B] text-white shadow-xs font-bold"
              : "text-[#172B25] hover:bg-[#F8FAF9]"
          )}
        >
          <span className="truncate">All Products</span>
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1.5",
              selectedCategory === "All"
                ? "bg-white/20 text-white"
                : "bg-[#F0F4F2] text-[#718078]"
            )}
          >
            {totalProductsCount}
          </span>
        </button>

        {filteredCategories.map((c) => {
          const isSelected = selectedCategory === c.id;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCategory(c.id)}
              className={cn(
                "w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition text-left",
                isSelected
                  ? "bg-[#16845B] text-white shadow-xs font-bold"
                  : "text-[#172B25] hover:bg-[#F8FAF9]"
              )}
            >
              <span className="truncate">{c.name}</span>
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1.5",
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-[#F0F4F2] text-[#718078]"
                )}
              >
                {c.count}
              </span>
            </button>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="text-center py-6 text-xs text-[#718078]">
            No categories matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>

      {/* Footer Toggle: In-Stock Only */}
      <div className="pt-2.5 border-t border-[#E5EBE7] px-1">
        <label className="flex items-center justify-between cursor-pointer text-xs text-[#172B25] font-semibold select-none">
          <span>In-Stock Only</span>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => onInStockOnlyChange(e.target.checked)}
            className="rounded border-[#E5EBE7] text-[#16845B] focus:ring-[#16845B]/30 h-4 w-4 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
