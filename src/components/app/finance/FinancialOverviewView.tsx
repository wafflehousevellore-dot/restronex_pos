"use client";

import React from "react";
import {
  Banknote,
  CreditCard,
  QrCode,
  Globe,
  Receipt,
  Percent,
  TrendingUp,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatINR } from "@/lib/money";
import { FinanceSummaryData } from "@/app/api/finance/route";

interface FinancialOverviewViewProps {
  data: FinanceSummaryData;
}

export function FinancialOverviewView({ data }: FinancialOverviewViewProps) {
  const tenderIcons: Record<string, any> = {
    CASH: Banknote,
    UPI: QrCode,
    CARD: CreditCard,
    RAZORPAY_ONLINE: Globe,
    SWIGGY: Receipt,
    ZOMATO: Receipt,
    OTHER: Receipt,
  };

  return (
    <div className="space-y-6">
      {/* 2-Column High-Level Financial Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P&L Reconciliation Ledger */}
        <div className="rounded-xl border border-[#E5EBE7] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#16845B]" />
              <h3 className="text-sm font-bold text-[#172B25]">
                Profit & Loss / Sales Ledger
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#718078]">
              {data.startDate} to {data.endDate}
            </span>
          </div>

          <div className="divide-y divide-[#E5EBE7] text-xs pt-2">
            <div className="flex items-center justify-between py-2.5">
              <span className="font-semibold text-[#172B25]">1. Gross Menu Sales (Item Value)</span>
              <span className="font-mono font-bold text-[#172B25]">
                {formatINR(data.subtotalPaise)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5 text-amber-700">
              <span className="font-semibold">2. Less: Order Discounts &amp; Coupons</span>
              <span className="font-mono font-bold">
                -{formatINR(data.discountPaise)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5 bg-[#F8FAF9] px-2 rounded-md font-bold text-[#172B25]">
              <span>Net Taxable Turnover (1 - 2)</span>
              <span className="font-mono text-emerald-800">
                {formatINR(Math.max(0, data.subtotalPaise - data.discountPaise))}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5 text-sky-800">
              <span className="font-semibold">3. Add: Total Taxes Collected (GST)</span>
              <span className="font-mono font-bold">
                +{formatINR(data.totalTaxPaise)}
              </span>
            </div>

            {data.serviceChargePaise > 0 && (
              <div className="flex items-center justify-between py-2.5 text-purple-700">
                <span className="font-semibold">4. Add: Service Charges Collected</span>
                <span className="font-mono font-bold">
                  +{formatINR(data.serviceChargePaise)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-2.5 bg-gray-50 px-2 rounded-md font-bold text-[#172B25]">
              <span>Gross Billed Total</span>
              <span className="font-mono text-emerald-800">
                {formatINR(data.grossSalesPaise)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5 text-rose-700">
              <span className="font-semibold">5. Less: Customer Refunds &amp; Voids</span>
              <span className="font-mono font-bold">
                -{formatINR(data.refundedPaise)}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 bg-[#E8F5EE] px-3 rounded-lg font-black text-sm text-[#16845B]">
              <span>Net Realized Revenue</span>
              <span className="font-mono text-base">
                {formatINR(data.netSalesPaise)}
              </span>
            </div>
          </div>
        </div>

        {/* GST Tax Compliance Breakdown */}
        <div className="rounded-xl border border-[#E5EBE7] bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-[#16845B]" />
                <h3 className="text-sm font-bold text-[#172B25]">
                  GST Tax Summary &amp; Government Remittance
                </h3>
              </div>
              <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                GSTR-1 Compatible
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#718078]">Net Taxable Base Turnover:</span>
                  <span className="font-mono font-bold text-[#172B25]">
                    {formatINR(Math.max(0, data.subtotalPaise - data.discountPaise))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#718078]">Effective Restaurant GST Rate:</span>
                  <span className="font-bold text-[#16845B]">5.0% (Standard F&amp;B)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-[#E5EBE7] p-3 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                    CGST (Central 2.5%)
                  </div>
                  <div className="mt-1 text-base font-bold text-[#172B25] font-mono">
                    {formatINR(data.cgstPaise)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[#718078]">Central Tax Portion</div>
                </div>

                <div className="rounded-xl border border-[#E5EBE7] p-3 text-center">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                    SGST (State 2.5%)
                  </div>
                  <div className="mt-1 text-base font-bold text-[#172B25] font-mono">
                    {formatINR(data.sgstPaise)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[#718078]">State/UT Tax Portion</div>
                </div>
              </div>

              {data.igstPaise > 0 && (
                <div className="rounded-xl border border-[#E5EBE7] p-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#172B25]">IGST (Interstate 5.0%):</span>
                  <span className="font-mono font-bold text-[#172B25]">{formatINR(data.igstPaise)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-sky-900">Total Tax Remittance Obligation</div>
              <div className="text-[11px] text-sky-700">Output tax liability for reporting period</div>
            </div>
            <div className="text-base font-black text-sky-950 font-mono">
              {formatINR(data.totalTaxPaise)}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Tender Distribution & Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Breakdown */}
        <div className="rounded-xl border border-[#E5EBE7] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-[#16845B]" />
              <h3 className="text-sm font-bold text-[#172B25]">
                Payment Tender Breakdown
              </h3>
            </div>
            <span className="text-[11px] text-[#718078]">All settled orders</span>
          </div>

          <div className="mt-3 space-y-3">
            {data.paymentMethods.map((tender) => {
              const Icon = tenderIcons[tender.method] || Receipt;
              return (
                <div key={tender.method} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold text-[#172B25]">
                      <Icon className="h-3.5 w-3.5 text-[#16845B]" />
                      <span>{tender.label}</span>
                      <span className="text-[10px] text-[#718078]">({tender.count} bills)</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-[#172B25]">{formatINR(tender.amountPaise)}</span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700 font-sans font-bold">
                        {tender.sharePct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#16845B]"
                      style={{ width: `${tender.sharePct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="rounded-xl border border-[#E5EBE7] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[#16845B]" />
              <h3 className="text-sm font-bold text-[#172B25]">
                Order Service Channels
              </h3>
            </div>
            <span className="text-[11px] text-[#718078]">Volume &amp; Revenue</span>
          </div>

          <div className="mt-3 space-y-3">
            {data.channels.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#718078]">
                No channel orders logged in this period.
              </div>
            ) : (
              data.channels.map((chan) => (
                <div key={chan.channel} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-semibold text-[#172B25]">
                      <span>{chan.channel.replace(/_/g, " ")}</span>
                      <span className="ml-2 text-[10px] text-[#718078]">
                        ({chan.ordersCount} orders)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-[#172B25]">{formatINR(chan.salesPaise)}</span>
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700 font-sans font-bold">
                        {chan.sharePct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600"
                      style={{ width: `${chan.sharePct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Outlet-Wise Financial Comparison Table */}
      {data.outletBreakdown.length > 1 && (
        <div className="overflow-hidden rounded-xl border border-[#E5EBE7] bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] bg-[#F8FAF9] px-4 py-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#16845B]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B25]">
                Cross-Branch Financial Comparison
              </h3>
            </div>
            <span className="text-[11px] text-[#718078]">
              {data.outletBreakdown.length} active branches consolidated
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9]/60 text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                  <th className="py-2.5 px-4">Outlet Name</th>
                  <th className="py-2.5 px-4">City</th>
                  <th className="py-2.5 px-4 text-right">Orders</th>
                  <th className="py-2.5 px-4 text-right">Gross Sales</th>
                  <th className="py-2.5 px-4 text-right">Taxes (GST)</th>
                  <th className="py-2.5 px-4 text-right">Discounts</th>
                  <th className="py-2.5 px-4 text-right">Avg Order Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {data.outletBreakdown.map((o) => (
                  <tr key={o.outletId} className="hover:bg-[#F8FAF9] transition">
                    <td className="py-3 px-4 font-bold text-[#172B25]">{o.outletName}</td>
                    <td className="py-3 px-4 text-[#718078]">{o.city || "—"}</td>
                    <td className="py-3 px-4 text-right font-mono">{o.ordersCount}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                      {formatINR(o.grossSalesPaise)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sky-800">
                      {formatINR(o.taxPaise)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-800">
                      {formatINR(o.discountPaise)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {formatINR(o.avgOrderPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
