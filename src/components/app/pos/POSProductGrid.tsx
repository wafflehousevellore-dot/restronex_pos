"use client";

import * as React from "react";
import { Search, Sparkles, Plus, AlertCircle, UtensilsCrossed } from "lucide-react";
import { formatINR } from "@/lib/money";
import { MenuItem } from "../POSClient";
import { cn } from "@/lib/utils";

export interface POSProductGridProps {
  items: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
}

export function POSProductGrid({
  items,
  onSelectItem,
  searchQuery,
  onSearchChange,
  searchInputRef,
  className,
}: POSProductGridProps) {
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-white border border-[#E5EBE7] rounded-3xl p-4 shadow-2xs overflow-hidden",
        className
      )}
    >
      {/* Top Search Toolbar */}
      <div className="pb-3 border-b border-[#E5EBE7] flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718078]" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search items by name or code... (Press F1 or /)"
            className="w-full h-10 rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] pl-9 pr-14 text-sm text-[#172B25] placeholder-[#A0ACA5] focus:outline-none focus:border-[#16845B] focus:bg-white focus:ring-2 focus:ring-[#16845B]/15 transition"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] text-[#718078] bg-white border border-[#E5EBE7] rounded-md pointer-events-none">
            F1
          </kbd>
        </div>

        <div className="text-xs font-semibold text-[#718078] shrink-0">
          <span className="font-bold text-[#172B25]">{items.length}</span> items
        </div>
      </div>

      {/* Product Tiles Scrollable Grid */}
      <div className="flex-1 overflow-y-auto pt-3 scrollbar-thin">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#718078]">
            <div className="h-12 w-12 rounded-2xl bg-[#F0F4F2] flex items-center justify-center text-[#718078] mb-3">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <div className="text-sm font-bold text-[#172B25]">No menu items found</div>
            <div className="text-xs mt-1 max-w-xs">
              No products match your current search and category filters.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {items.map((item) => {
              const hasAddons = (item.addonLinks && item.addonLinks.length > 0);
              const isSoldOut = Boolean(item.isSoldOut);

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isSoldOut}
                  onClick={() => onSelectItem(item)}
                  className={cn(
                    "group relative flex flex-col rounded-2xl border p-2.5 text-left transition-all active:scale-[0.98] select-none",
                    isSoldOut
                      ? "bg-[#F8FAF9] border-[#E5EBE7] opacity-60 cursor-not-allowed"
                      : "bg-white border-[#E5EBE7] hover:border-[#16845B] hover:shadow-md cursor-pointer"
                  )}
                >
                  {/* Item Image / Fallback Tile */}
                  <div className="relative aspect-[4/3] w-full bg-[#F8FAF9] rounded-xl overflow-hidden border border-[#E5EBE7] mb-2">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#F8FAF9] to-[#E8F5EE]/40 text-[#16845B] font-black text-lg">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Veg / Non-Veg Dot Indicator */}
                    <span className="absolute top-1.5 left-1.5 rounded-md bg-white/90 backdrop-blur-xs p-1 shadow-2xs border border-[#E5EBE7]">
                      <span
                        className={cn(
                          "block h-2 w-2 rounded-full",
                          item.isVeg ? "bg-emerald-600" : "bg-red-600"
                        )}
                      />
                    </span>

                    {/* Modifiers Badge */}
                    {hasAddons && !isSoldOut && (
                      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-[#16845B] text-white text-[9px] font-bold px-1.5 py-0.5 shadow-2xs">
                        Customise
                      </span>
                    )}

                    {/* Sold Out Overlay */}
                    {isSoldOut && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center">
                        <span className="rounded-md bg-red-600 text-white text-[10px] font-bold px-2 py-0.5">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Item Metadata */}
                  <div className="flex-1 flex flex-col justify-between space-y-1">
                    <div className="font-bold text-xs text-[#172B25] line-clamp-2 leading-tight group-hover:text-[#16845B] transition-colors">
                      {item.name}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-black text-sm text-[#16845B]">
                        {formatINR(item.pricePaise)}
                      </span>

                      {!isSoldOut && (
                        <div className="h-6 w-6 rounded-lg bg-[#E8F5EE] group-hover:bg-[#16845B] text-[#16845B] group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
