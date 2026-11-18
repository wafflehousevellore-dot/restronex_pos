"use client";

import * as React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SummaryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  change?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  icon?: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  action?: React.ReactNode;
  loading?: boolean;
}

export function SummaryCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  iconBg = "bg-[#E8F5EE] text-[#16845B]",
  action,
  loading = false,
  className,
  ...props
}: SummaryCardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs animate-pulse space-y-3",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div className="h-3.5 bg-[#F0F4F2] rounded w-24" />
          <div className="h-9 w-9 bg-[#F0F4F2] rounded-xl" />
        </div>
        <div className="h-7 bg-[#F0F4F2] rounded w-32" />
        <div className="h-3 bg-[#F0F4F2] rounded w-40" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E5EBE7] bg-white p-5 text-[#172B25] shadow-xs hover:shadow-sm hover:border-[#16845B]/30 transition-all flex flex-col justify-between",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-xs font-bold text-[#718078] uppercase tracking-wider truncate">
          {title}
        </span>
        {Icon && (
          <div
            className={cn(
              "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border border-[#16845B]/10 shadow-2xs",
              iconBg
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-black text-[#172B25] tracking-tight">
          {value}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {change !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full border",
                change.value > 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : change.value < 0
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-neutral-50 text-neutral-600 border-neutral-200"
              )}
            >
              {change.value > 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : change.value < 0 ? (
                <ArrowDownRight className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span>{Math.abs(change.value)}%</span>
            </span>
          )}

          {change?.label && (
            <span className="text-xs text-[#718078] truncate">{change.label}</span>
          )}

          {!change && subtitle && (
            <span className="text-xs text-[#718078] truncate">{subtitle}</span>
          )}
        </div>
      </div>

      {action && <div className="mt-3 pt-3 border-t border-[#E5EBE7]/60">{action}</div>}
    </div>
  );
}
