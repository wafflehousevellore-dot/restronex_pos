"use client";

import React from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Calendar,
  Layers,
  UtensilsCrossed,
  Package,
  Receipt,
  Building2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportFilters } from "@/lib/enterprise-reporting";

interface ExportCenterTabProps {
  filters: ReportFilters;
  dateRangeLabel: string;
}

export function ExportCenterTab({ filters, dateRangeLabel }: ExportCenterTabProps) {
  const getExportUrl = (type: string) => {
    const params = new URLSearchParams();
    params.set("type", type);
    if (filters.outletId) params.set("outletId", filters.outletId);
    if (filters.rangePreset) params.set("rangePreset", filters.rangePreset);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    return `/api/reports/export?${params.toString()}`;
  };

  const reportsCatalog = [
    {
      id: "sales_daily",
      title: "Daily Sales & Revenue Statement",
      description: "Day-by-day gross sales, discounts, GST tax collected, net revenue, and billed order counts.",
      icon: FileSpreadsheet,
      badge: "Core Sales",
      filename: "sales-daily.csv",
    },
    {
      id: "gst_tax",
      title: "GSTR-1 Tax Summary (India)",
      description: "Accountant-ready GST collection matrix showing taxable value, CGST 2.5%, and SGST 2.5% per outlet.",
      icon: Receipt,
      badge: "Tax & GSTR-1",
      filename: "gst-tax-summary.csv",
    },
    {
      id: "product_ranking",
      title: "Product Revenue & Menu Margins",
      description: "Item velocity leaderboard, units sold, revenue share %, estimated recipe food cost, and gross margin.",
      icon: UtensilsCrossed,
      badge: "Menu Analytics",
      filename: "product-ranking.csv",
    },
    {
      id: "day_end",
      title: "Day-End Closing Z-Reports",
      description: "Immutable register closing sessions, cash totals, petty cash expenses, and operator closed timestamps.",
      icon: Layers,
      badge: "Cash Accounting",
      filename: "day-end-z-reports.csv",
    },
    {
      id: "inventory_valuation",
      title: "Inventory Valuation & Low Stock",
      description: "Raw material inventory on hand, unit costs, total asset valuation, and low stock threshold alerts.",
      icon: Package,
      badge: "Inventory & BOM",
      filename: "inventory-valuation.csv",
    },
    {
      id: "expense_summary",
      title: "Operating Expenses Breakdown",
      description: "Categorized petty cash, groceries, utilities, rent, maintenance, and staff welfare expenses.",
      icon: FileText,
      badge: "Overheads",
      filename: "expense-summary.csv",
    },
    {
      id: "outlet_performance",
      title: "Multi-Outlet Revenue Leaderboard",
      description: "Branch-wise comparison of order throughput, gross sales, average order value, and chain revenue share %.",
      icon: Building2,
      badge: "Head Office",
      filename: "outlet-performance.csv",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Safety Protocol */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E5EBE7] pb-3">
          <div>
            <h3 className="text-base font-black text-[#172B25] flex items-center gap-2">
              <Download className="h-5 w-5 text-[#16845B]" />
              Enterprise Report Export Center
            </h3>
            <p className="text-xs text-[#718078]">
              Generate and stream certified CSV reports reflecting active filter scope: <b>{dateRangeLabel}</b>
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[#E8F5EE] border border-[#16845B]/30 px-3 py-1 text-xs font-bold text-[#16845B]">
            <ShieldCheck className="h-4 w-4" /> Formula Injection Shield Active
          </div>
        </div>

        <div className="text-[11px] text-[#718078] leading-relaxed bg-[#F8FAF9] p-3 rounded-xl border border-[#E5EBE7]">
          RestroNex enforces enterprise export sanitization. All spreadsheet cells starting with formula symbols (<code>=</code>, <code>+</code>, <code>-</code>, <code>@</code>) are automatically neutralized to prevent remote DDE/CSV injection attacks.
        </div>
      </div>

      {/* 2. Downloadable Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportsCatalog.map((report) => {
          const Icon = report.icon;
          return (
            <div
              key={report.id}
              className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs hover:shadow-sm transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F5EE] text-[#16845B]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] px-2.5 py-0.5 uppercase tracking-wide">
                    {report.badge}
                  </span>
                </div>

                <h4 className="text-sm font-black text-[#172B25]">{report.title}</h4>
                <p className="text-xs text-[#718078] leading-relaxed">{report.description}</p>
              </div>

              <div className="pt-3 border-t border-[#E5EBE7] flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#718078]">{report.filename}</span>
                <a
                  href={getExportUrl(report.id)}
                  download
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-3.5 py-2 shadow-xs transition cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
