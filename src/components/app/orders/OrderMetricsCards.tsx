"use client";

import React from "react";
import { formatINR } from "@/lib/money";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  ChefHat,
  BellRing,
  CheckCheck,
  XCircle,
  IndianRupee,
} from "lucide-react";

export interface OrderMetrics {
  total: number;
  new: number;
  accepted: number;
  preparing: number;
  ready: number;
  completed: number;
  cancelled: number;
  totalValuePaise: number;
}

interface OrderMetricsCardsProps {
  metrics: OrderMetrics;
  activeStatusFilter: string;
  onSelectStatus: (status: string) => void;
}

export function OrderMetricsCards({
  metrics,
  activeStatusFilter,
  onSelectStatus,
}: OrderMetricsCardsProps) {
  const cards = [
    {
      id: "ALL",
      label: "Total Orders",
      value: metrics.total,
      icon: ShoppingBag,
      color: "text-slate-800",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
      activeRing: "ring-2 ring-slate-800 border-transparent",
    },
    {
      id: "NEW",
      label: "New Orders",
      value: metrics.new,
      icon: BellRing,
      color: "text-amber-700",
      bgColor: "bg-amber-50/70",
      borderColor: "border-amber-200",
      activeRing: "ring-2 ring-amber-600 border-transparent",
      highlight: metrics.new > 0,
    },
    {
      id: "ACCEPTED",
      label: "Accepted",
      value: metrics.accepted,
      icon: Clock,
      color: "text-blue-700",
      bgColor: "bg-blue-50/70",
      borderColor: "border-blue-200",
      activeRing: "ring-2 ring-blue-600 border-transparent",
    },
    {
      id: "PREPARING",
      label: "Preparing",
      value: metrics.preparing,
      icon: ChefHat,
      color: "text-purple-700",
      bgColor: "bg-purple-50/70",
      borderColor: "border-purple-200",
      activeRing: "ring-2 ring-purple-600 border-transparent",
    },
    {
      id: "READY",
      label: "Ready for Pickup",
      value: metrics.ready,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bgColor: "bg-emerald-50/70",
      borderColor: "border-emerald-200",
      activeRing: "ring-2 ring-emerald-600 border-transparent",
      highlight: metrics.ready > 0,
    },
    {
      id: "COMPLETED",
      label: "Completed",
      value: metrics.completed,
      icon: CheckCheck,
      color: "text-teal-700",
      bgColor: "bg-teal-50/70",
      borderColor: "border-teal-200",
      activeRing: "ring-2 ring-teal-600 border-transparent",
    },
    {
      id: "CANCELLED",
      label: "Cancelled",
      value: metrics.cancelled,
      icon: XCircle,
      color: "text-rose-700",
      bgColor: "bg-rose-50/70",
      borderColor: "border-rose-200",
      activeRing: "ring-2 ring-rose-600 border-transparent",
    },
    {
      id: "REVENUE",
      label: "Total Value",
      value: formatINR(metrics.totalValuePaise),
      isText: true,
      icon: IndianRupee,
      color: "text-[#16845B]",
      bgColor: "bg-[#E8F5EE]/80",
      borderColor: "border-[#16845B]/20",
      activeRing: "",
      nonFilterable: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = !card.nonFilterable && activeStatusFilter === card.id;

        return (
          <button
            key={card.id}
            type="button"
            disabled={card.nonFilterable}
            onClick={() => {
              if (!card.nonFilterable) {
                onSelectStatus(card.id);
              }
            }}
            className={`flex flex-col justify-between p-3 rounded-xl border text-left transition relative ${
              card.bgColor
            } ${card.borderColor} ${
              isSelected
                ? card.activeRing + " shadow-sm"
                : card.nonFilterable
                ? "cursor-default"
                : "hover:border-slate-400 hover:shadow-xs cursor-pointer"
            }`}
          >
            {card.highlight && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}

            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-semibold text-slate-500 truncate pr-1">
                {card.label}
              </span>
              <Icon className={`w-3.5 h-3.5 ${card.color} shrink-0 opacity-80`} />
            </div>

            <div className="mt-1.5">
              <span className={`text-base font-black tracking-tight ${card.color}`}>
                {card.value}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
