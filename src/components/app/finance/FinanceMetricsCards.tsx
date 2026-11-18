"use client";

import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Percent,
  Banknote,
  RotateCcw,
  CreditCard,
  Building2,
  Calendar,
} from "lucide-react";
import { formatINR } from "@/lib/money";

interface FinanceMetricsCardsProps {
  grossSalesPaise: number;
  netSalesPaise: number;
  totalTaxPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  discountPaise: number;
  refundedPaise: number;
  ordersCount: number;
  avgOrderValuePaise: number;
  salesGrowthPct: number | null;
  complimentaryOrdersCount: number;
}

export function FinanceMetricsCards({
  grossSalesPaise,
  netSalesPaise,
  totalTaxPaise,
  cgstPaise,
  sgstPaise,
  discountPaise,
  refundedPaise,
  ordersCount,
  avgOrderValuePaise,
  salesGrowthPct,
  complimentaryOrdersCount,
}: FinanceMetricsCardsProps) {
  const cards = [
    {
      title: "Gross Sales Revenue",
      value: formatINR(grossSalesPaise),
      subtext:
        salesGrowthPct !== null
          ? `${salesGrowthPct >= 0 ? "+" : ""}${salesGrowthPct}% vs prior period`
          : "Historical actuals",
      growthPositive: salesGrowthPct !== null ? salesGrowthPct >= 0 : undefined,
      icon: Banknote,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      title: "Net Realized Revenue",
      value: formatINR(netSalesPaise),
      subtext: `After ₹${(refundedPaise / 100).toLocaleString("en-IN")} refunds`,
      icon: TrendingUp,
      color: "text-teal-700 bg-teal-50 border-teal-200",
    },
    {
      title: "Orders & Avg Order Value",
      value: `${ordersCount.toLocaleString()} orders`,
      subtext: `AOV: ${formatINR(avgOrderValuePaise)} per ticket`,
      icon: Receipt,
      color: "text-indigo-700 bg-indigo-50 border-indigo-200",
    },
    {
      title: "Taxes Collected (GST)",
      value: formatINR(totalTaxPaise),
      subtext: `CGST: ${formatINR(cgstPaise)} • SGST: ${formatINR(sgstPaise)}`,
      icon: Percent,
      color: "text-sky-700 bg-sky-50 border-sky-200",
    },
    {
      title: "Discounts & Promos",
      value: formatINR(discountPaise),
      subtext: `${complimentaryOrdersCount} complimentary bills`,
      icon: Percent,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      title: "Refunds & Reversals",
      value: formatINR(refundedPaise),
      subtext: refundedPaise > 0 ? "Processed payment refunds" : "Zero chargebacks",
      icon: RotateCcw,
      color: refundedPaise > 0 ? "text-rose-700 bg-rose-50 border-rose-200" : "text-gray-700 bg-gray-50 border-gray-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-xl border border-[#E5EBE7] bg-white p-4 shadow-xs transition hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#718078] truncate">{c.title}</span>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${c.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold tracking-tight text-[#172B25]">{c.value}</div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-[#718078]">
                {c.growthPositive !== undefined && (
                  <span
                    className={`font-bold ${
                      c.growthPositive ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {c.growthPositive ? "▲" : "▼"}
                  </span>
                )}
                <span className="truncate">{c.subtext}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
