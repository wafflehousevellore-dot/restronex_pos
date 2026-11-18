"use client";

import React from "react";
import {
  ChefHat,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Timer,
} from "lucide-react";

export interface KdsMetrics {
  totalActive: number;
  newCount: number;
  preparingCount: number;
  readyCount: number;
  delayedCount: number;
  completedCount: number;
  avgPrepMinutes: number;
}

interface KDSMetricsSummaryProps {
  metrics: KdsMetrics;
  activeStatusFilter: string;
  onSelectStatusFilter: (status: string) => void;
  onOpenCompletedDrawer: () => void;
}

export function KDSMetricsSummary({
  metrics,
  activeStatusFilter,
  onSelectStatusFilter,
  onOpenCompletedDrawer,
}: KDSMetricsSummaryProps) {
  const buckets = [
    {
      id: "ALL",
      label: "Active Tickets",
      value: metrics.totalActive,
      icon: ChefHat,
      color: "text-slate-900",
      bgColor: "bg-slate-100",
      borderColor: "border-slate-300",
      activeRing: "ring-2 ring-slate-800",
    },
    {
      id: "RECEIVED",
      label: "New KOTs",
      value: metrics.newCount,
      icon: Bell,
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      activeRing: "ring-2 ring-amber-600",
      pulse: metrics.newCount > 0,
    },
    {
      id: "PREPARING",
      label: "Cooking Now",
      value: metrics.preparingCount,
      icon: Clock,
      color: "text-purple-700",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      activeRing: "ring-2 ring-purple-600",
    },
    {
      id: "READY",
      label: "Ready for Pickup",
      value: metrics.readyCount,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      activeRing: "ring-2 ring-emerald-600",
      pulse: metrics.readyCount > 0,
    },
    {
      id: "DELAYED",
      label: "Delayed (>15m)",
      value: metrics.delayedCount,
      icon: AlertTriangle,
      color: "text-rose-700",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200",
      activeRing: "ring-2 ring-rose-600",
      blink: metrics.delayedCount > 0,
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-white p-2.5 rounded-xl border border-slate-800 shadow-md">
      {/* Metric Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {buckets.map((b) => {
          const Icon = b.icon;
          const isSelected = activeStatusFilter === b.id;

          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelectStatusFilter(b.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer relative ${
                isSelected
                  ? "bg-white text-slate-900 border-white shadow-xs"
                  : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {b.pulse && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}

              {b.blink && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}

              <Icon className="w-3.5 h-3.5 opacity-80" />
              <span>{b.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] font-black ${
                  isSelected ? "bg-slate-900 text-white" : "bg-slate-700 text-slate-200"
                }`}
              >
                {b.value}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: Avg Prep Time & History Drawer Trigger */}
      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs">
        <div className="hidden md:flex items-center gap-1.5 text-slate-400 font-semibold px-2">
          <Timer className="w-3.5 h-3.5 text-slate-500" />
          <span>Avg Prep: {metrics.avgPrepMinutes}m</span>
        </div>

        <button
          type="button"
          onClick={onOpenCompletedDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow-xs"
        >
          <History className="w-3.5 h-3.5 text-slate-400" />
          <span>Completed ({metrics.completedCount})</span>
        </button>
      </div>
    </div>
  );
}
