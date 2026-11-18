"use client";

import React from "react";
import {
  Wallet,
  Receipt,
  FileText,
  DollarSign,
  PieChart,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { EnterpriseReportingPayload } from "@/lib/enterprise-reporting";

interface FinancialAccountingTabProps {
  data: EnterpriseReportingPayload;
}

export function FinancialAccountingTab({ data }: FinancialAccountingTabProps) {
  const fa = data.financialAccounting;
  const is = fa.incomeStatement;

  return (
    <div className="space-y-6">
      {/* 1. Formal Executive Income Statement */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
          <div>
            <h3 className="text-sm font-black text-[#172B25] flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#16845B]" />
              Executive Income & Operating Expense Statement
            </h3>
            <p className="text-xs text-[#718078]">
              Consolidated revenue, discounts, direct food costs, and overhead expenses
            </p>
          </div>
          <span className="text-xs font-bold text-[#718078]">{data.dateRange.label}</span>
        </div>

        <div className="divide-y divide-[#E5EBE7] text-xs">
          <div className="py-2.5 flex justify-between font-bold text-[#172B25]">
            <span>1. Gross Sales Revenue</span>
            <span>₹{Math.round(is.grossRevenuePaise / 100).toLocaleString()}</span>
          </div>

          <div className="py-2.5 flex justify-between text-amber-800 font-semibold pl-4">
            <span>Less: Customer Discounts & Vouchers</span>
            <span>-₹{Math.round(is.discountsPaise / 100).toLocaleString()}</span>
          </div>

          <div className="py-2.5 flex justify-between font-black text-emerald-900 bg-[#E8F5EE]/40 px-2 rounded-lg">
            <span>2. Net Sales Revenue (Sales Before Tax)</span>
            <span>₹{Math.round(is.netRevenuePaise / 100).toLocaleString()}</span>
          </div>

          <div className="py-2.5 flex justify-between text-rose-700 font-semibold pl-4">
            <span>Less: Direct Cost of Goods Sold (BOM Recipe Ingredients)</span>
            <span>
              {is.costOfGoodsPaise > 0
                ? `-₹${Math.round(is.costOfGoodsPaise / 100).toLocaleString()}`
                : "Not Configured"}
            </span>
          </div>

          <div className="py-2.5 flex justify-between font-black text-[#172B25] bg-[#F8FAF9] px-2 rounded-lg">
            <span>3. Gross Operating Margin</span>
            <span>₹{Math.round(is.grossMarginPaise / 100).toLocaleString()}</span>
          </div>

          <div className="py-2.5 flex justify-between text-purple-800 font-semibold pl-4">
            <span>Less: Operating Overhead Expenses (Petty Cash, Utilities, Rent)</span>
            <span>-₹{Math.round(is.operatingExpensesPaise / 100).toLocaleString()}</span>
          </div>

          <div className="py-3 flex justify-between font-black text-base text-white bg-[#172B25] px-4 rounded-xl mt-2">
            <span>4. Net Operating Income</span>
            <span className="text-emerald-400">
              ₹{Math.round(is.netOperatingIncomePaise / 100).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Expense Category Distribution */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-2.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25] flex items-center gap-1.5">
            <PieChart className="h-4 w-4 text-[#16845B]" /> Operating Expense Category Distribution
          </h3>
          <span className="text-xs font-bold text-purple-900">
            Total: ₹{Math.round(is.operatingExpensesPaise / 100).toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {fa.expenseCategories.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-[#718078]">
              No operating expenses recorded for this period.
            </div>
          ) : (
            fa.expenseCategories.map((ec) => (
              <div key={ec.category} className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-1">
                <div className="text-[10px] font-bold uppercase text-[#718078] truncate">{ec.category}</div>
                <div className="text-base font-black text-[#172B25]">
                  ₹{Math.round(ec.amountPaise / 100).toLocaleString()}
                </div>
                <div className="text-[10px] font-bold text-purple-700">
                  {ec.sharePct}% share • {ec.count} bills
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Day-End Closing History (Z-Reports) */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#16845B]" />
            <h3 className="text-sm font-black text-[#172B25]">
              Day-End Z-Report Closing History ({fa.recentDayEnds.length})
            </h3>
          </div>
          <span className="text-[11px] font-bold text-[#718078]">
            Immutable register closing audits
          </span>
        </div>

        <div className="overflow-x-auto max-h-[300px] scrollbar-thin">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] text-[10px] font-bold uppercase text-[#718078] sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-3">Outlet</th>
                <th className="py-2.5 px-3 text-center">Orders</th>
                <th className="py-2.5 px-3 text-right">Gross Sales</th>
                <th className="py-2.5 px-3 text-right">Petty Expenses</th>
                <th className="py-2.5 px-4 text-right">Closed Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-[#172B25]">
              {fa.recentDayEnds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-[#718078]">
                    No day-end closing sessions recorded yet.
                  </td>
                </tr>
              ) : (
                fa.recentDayEnds.map((d) => (
                  <tr key={d.id} className="hover:bg-[#F8FAF9] transition">
                    <td className="py-2.5 px-4 font-bold">{d.date}</td>
                    <td className="py-2.5 px-3 font-medium">{d.outletName}</td>
                    <td className="py-2.5 px-3 text-center font-semibold">{d.orders}</td>
                    <td className="py-2.5 px-3 text-right font-black text-[#172B25]">
                      ₹{Math.round(d.salesPaise / 100).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-rose-700">
                      ₹{Math.round(d.expensePaise / 100).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-[11px] text-[#718078]">
                      {new Date(d.closedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
