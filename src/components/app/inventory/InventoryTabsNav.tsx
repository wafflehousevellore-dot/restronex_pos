"use client";

import React from "react";
import { 
  Boxes, 
  UtensilsCrossed, 
  ShoppingBag, 
  Building2, 
  FileText, 
  Plus, 
  SlidersHorizontal, 
  ArrowRightLeft,
  Store,
} from "lucide-react";

export type InventoryTabType = "STOCK" | "BULK_SALES" | "RECIPES" | "PURCHASES" | "TRANSFERS" | "SUPPLIERS" | "REPORTS";

interface InventoryTabsNavProps {
  activeTab: InventoryTabType;
  onTabChange: (tab: InventoryTabType) => void;
  onOpenAddIngredient: () => void;
  onOpenAdjustment: () => void;
  onOpenTransfer: () => void;
  itemsCount: number;
  recipesCount: number;
  posCount: number;
  suppliersCount: number;
  bulkSalesCount?: number;
}

export function InventoryTabsNav({
  activeTab,
  onTabChange,
  onOpenAddIngredient,
  onOpenAdjustment,
  onOpenTransfer,
  itemsCount,
  recipesCount,
  posCount,
  suppliersCount,
  bulkSalesCount,
}: InventoryTabsNavProps) {
  const tabs = [
    { id: "STOCK" as InventoryTabType, label: "Stock & Products", icon: Boxes, count: itemsCount },
    { id: "BULK_SALES" as InventoryTabType, label: "Bulk Stock Sales", icon: Store, count: bulkSalesCount },
    { id: "PURCHASES" as InventoryTabType, label: "Purchases & Inward", icon: ShoppingBag, count: posCount },
    { id: "RECIPES" as InventoryTabType, label: "Recipes & BOM", icon: UtensilsCrossed, count: recipesCount },
    { id: "TRANSFERS" as InventoryTabType, label: "Outlet Transfers", icon: ArrowRightLeft },
    { id: "SUPPLIERS" as InventoryTabType, label: "Suppliers", icon: Building2, count: suppliersCount },
    { id: "REPORTS" as InventoryTabType, label: "Valuation & Ledger", icon: FileText },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5EBE7] pb-2">
      {/* Horizontal Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#172B25] text-white shadow-xs"
                  : "text-[#718078] hover:text-[#172B25] hover:bg-gray-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenTransfer}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5EBE7] hover:border-gray-300 rounded-xl text-xs font-bold text-[#172B25] shadow-2xs transition cursor-pointer"
          title="Transfer Stock to another outlet branch"
        >
          <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" />
          <span>Branch Transfer</span>
        </button>

        <button
          type="button"
          onClick={onOpenAdjustment}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5EBE7] hover:border-gray-300 rounded-xl text-xs font-bold text-[#172B25] shadow-2xs transition cursor-pointer"
          title="Record Spoilage, Damage, Expiry or Physical Count"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-amber-600" />
          <span>Adjust Stock</span>
        </button>

        <button
          type="button"
          onClick={onOpenAddIngredient}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Ingredient</span>
        </button>
      </div>
    </div>
  );
}
