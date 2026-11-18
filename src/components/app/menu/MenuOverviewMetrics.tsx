"use client";

import React from "react";
import {
  Utensils,
  CheckCircle2,
  XCircle,
  FolderTree,
  AlertTriangle,
  Layers,
  Leaf,
  Beef,
} from "lucide-react";

export interface MenuMetricsData {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  outOfStockProducts: number;
  productsWithModifiers: number;
  categoriesCount: number;
  vegCount: number;
  nonVegCount: number;
}

interface MenuOverviewMetricsProps {
  metrics: MenuMetricsData;
  activeFilter: string;
  onFilterSelect: (filter: string) => void;
}

export function MenuOverviewMetrics({
  metrics,
  activeFilter,
  onFilterSelect,
}: MenuOverviewMetricsProps) {
  const cards = [
    {
      id: "ALL",
      label: "Total Products",
      value: metrics.totalProducts,
      icon: Utensils,
      color: "text-slate-900",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
      ring: "ring-2 ring-slate-800",
    },
    {
      id: "ACTIVE",
      label: "Active Products",
      value: metrics.activeProducts,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bgColor: "bg-emerald-50/70",
      borderColor: "border-emerald-200",
      ring: "ring-2 ring-emerald-600",
    },
    {
      id: "OUT_OF_STOCK",
      label: "Out of Stock",
      value: metrics.outOfStockProducts,
      icon: AlertTriangle,
      color: "text-rose-700",
      bgColor: "bg-rose-50/70",
      borderColor: "border-rose-200",
      ring: "ring-2 ring-rose-600",
      highlight: metrics.outOfStockProducts > 0,
    },
    {
      id: "CATEGORIES",
      label: "Categories",
      value: metrics.categoriesCount,
      icon: FolderTree,
      color: "text-indigo-700",
      bgColor: "bg-indigo-50/70",
      borderColor: "border-indigo-200",
      ring: "ring-2 ring-indigo-600",
      nonFilterable: true,
    },
    {
      id: "WITH_MODIFIERS",
      label: "With Modifiers",
      value: metrics.productsWithModifiers,
      icon: Layers,
      color: "text-purple-700",
      bgColor: "bg-purple-50/70",
      borderColor: "border-purple-200",
      ring: "ring-2 ring-purple-600",
    },
    {
      id: "VEG",
      label: "Pure Veg Items",
      value: metrics.vegCount,
      icon: Leaf,
      color: "text-emerald-700",
      bgColor: "bg-emerald-50/40",
      borderColor: "border-emerald-200",
      ring: "ring-2 ring-emerald-600",
    },
    {
      id: "NON_VEG",
      label: "Non-Veg Items",
      value: metrics.nonVegCount,
      icon: Beef,
      color: "text-red-700",
      bgColor: "bg-red-50/40",
      borderColor: "border-red-200",
      ring: "ring-2 ring-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = !card.nonFilterable && activeFilter === card.id;

        return (
          <button
            key={card.id}
            type="button"
            disabled={card.nonFilterable}
            onClick={() => {
              if (!card.nonFilterable) {
                onFilterSelect(card.id);
              }
            }}
            className={`flex flex-col justify-between p-3 rounded-xl border text-left transition relative ${
              card.bgColor
            } ${card.borderColor} ${
              isSelected
                ? card.ring + " shadow-sm border-transparent"
                : card.nonFilterable
                ? "cursor-default"
                : "hover:border-slate-400 hover:shadow-xs cursor-pointer"
            }`}
          >
            {card.highlight && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}

            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-semibold text-slate-500 truncate pr-1">
                {card.label}
              </span>
              <Icon className={`w-3.5 h-3.5 ${card.color} shrink-0 opacity-80`} />
            </div>

            <div className="mt-1.5">
              <span className={`text-lg font-black tracking-tight ${card.color}`}>
                {card.value}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
