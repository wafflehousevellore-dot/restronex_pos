"use client";

import React, { useState } from "react";
import {
  Receipt,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Building2,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Globe,
} from "lucide-react";
import { formatINR } from "@/lib/money";
import { ReconciliationItem } from "@/app/api/reconciliation/route";

interface PaymentReconciliationViewProps {
  items: ReconciliationItem[];
  summary: {
    totalAuditedOrders: number;
    matchedPaise: number;
    discrepancyPaise: number;
    pendingGatewayPaise: number;
    aggregatorVolumePaise: number;
    matchedCount: number;
    discrepancyCount: number;
  };
  outlets: Array<{ id: string; name: string }>;
  onRefresh: () => void;
  isOwnerOrManager: boolean;
}

export function PaymentReconciliationView({
  items,
  summary,
  outlets,
  onRefresh,
  isOwnerOrManager,
}: PaymentReconciliationViewProps) {
  const [selectedOutlet, setSelectedOutlet] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  // Resolving discrepancy modal state
  const [resolvingItem, setResolvingItem] = useState<ReconciliationItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const filteredItems = items.filter((item) => {
    const matchesOutlet = selectedOutlet === "ALL" || item.outletId === selectedOutlet;
    const matchesStatus = selectedStatus === "ALL" || item.reconciliationStatus === selectedStatus;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      item.orderNumber.toLowerCase().includes(q) ||
      item.channel.toLowerCase().includes(q) ||
      item.primaryMethod.toLowerCase().includes(q);

    return matchesOutlet && matchesStatus && matchesSearch;
  });

  async function handleResolveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolvingItem) return;

    setSubmittingResolution(true);
    try {
      const res = await fetch("/api/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: resolvingItem.id,
          status: "RESOLVED",
          notes: resolutionNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        setResolvingItem(null);
        setResolutionNotes("");
        onRefresh();
      } else {
        alert("Failed to record reconciliation resolution.");
      }
    } catch {
      alert("Error resolving payment discrepancy.");
    } finally {
      setSubmittingResolution(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
            <span>Fully Matched Orders</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-700 font-mono">
            {formatINR(summary.matchedPaise)}
          </div>
          <div className="text-[11px] text-[#718078]">{summary.matchedCount} orders balanced</div>
        </div>

        <div className="rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
            <span>Discrepancy / Unsettled</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-rose-700 font-mono">
            {formatINR(summary.discrepancyPaise)}
          </div>
          <div className="text-[11px] text-[#718078]">{summary.discrepancyCount} bills require review</div>
        </div>

        <div className="rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
            <span>Aggregator Channels</span>
            <Globe className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-indigo-700 font-mono">
            {formatINR(summary.aggregatorVolumePaise)}
          </div>
          <div className="text-[11px] text-[#718078]">Swiggy &amp; Zomato marketplace sales</div>
        </div>

        <div className="rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#718078]">
            <span>Total Audited Orders</span>
            <Receipt className="h-4 w-4 text-[#16845B]" />
          </div>
          <div className="mt-2 text-xl font-bold text-[#172B25]">
            {summary.totalAuditedOrders} bills
          </div>
          <div className="text-[11px] text-[#718078]">Audited against payment tenders</div>
        </div>
      </div>

      {/* Aggregator Marketplace Policy Banner */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-950 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-indigo-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-indigo-900">
            Marketplace Aggregator Accounting Isolation
          </div>
          <div className="text-indigo-800 leading-relaxed text-[11px]">
            Swiggy and Zomato customer payments are captured directly by their respective platforms. RestroNex tracks these as authorized marketplace orders and prevents double-counting them in cash drawer registers. Marketplace payouts are reconciled against bi-weekly platform settlement reports.
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#718078]" />
          <input
            type="text"
            placeholder="Search by order number or tender type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] py-2 pl-9 pr-3 text-xs text-[#172B25] placeholder-[#718078] outline-none transition focus:border-[#16845B] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] p-0.5 text-xs font-semibold">
            {(["ALL", "MATCHED", "DISCREPANCY", "UNPAID", "REFUNDED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`rounded-md px-2.5 py-1 text-[11px] transition ${
                  selectedStatus === s
                    ? "bg-white text-[#172B25] shadow-xs"
                    : "text-[#718078] hover:text-[#172B25]"
                }`}
              >
                {s === "ALL" && `All (${items.length})`}
                {s === "MATCHED" && `Matched (${items.filter((i) => i.reconciliationStatus === "MATCHED").length})`}
                {s === "DISCREPANCY" && `Discrepant (${items.filter((i) => i.reconciliationStatus === "DISCREPANCY").length})`}
                {s === "UNPAID" && `Unpaid (${items.filter((i) => i.reconciliationStatus === "UNPAID").length})`}
                {s === "REFUNDED" && `Refunded (${items.filter((i) => i.reconciliationStatus === "REFUNDED").length})`}
              </button>
            ))}
          </div>

          {/* Outlet Dropdown */}
          <select
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            className="rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#172B25] outline-none hover:bg-[#F2F5F3]"
          >
            <option value="ALL">All Outlets</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5EBE7] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9] text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                <th className="py-3 px-4">Order / Ticket</th>
                <th className="py-3 px-4">Date &amp; Outlet</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4 text-right">Bill Amount</th>
                <th className="py-3 px-4 text-right">Paid Tender</th>
                <th className="py-3 px-4">Payment Method / Gateway Ref</th>
                <th className="py-3 px-4">Audit Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#718078]">
                    No orders match the selected reconciliation filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAF9] transition">
                    {/* Order # */}
                    <td className="py-3 px-4 font-mono font-bold text-[#172B25]">
                      #{item.orderNumber}
                    </td>

                    {/* Date & Outlet */}
                    <td className="py-3 px-4">
                      <div className="text-[11px] text-[#172B25] font-semibold">
                        {item.outletName}
                      </div>
                      <div className="text-[10px] text-[#718078] font-mono">
                        {new Date(item.date).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Channel */}
                    <td className="py-3 px-4">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
                        {item.channel}
                      </span>
                    </td>

                    {/* Bill Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#172B25]">
                      {formatINR(item.billAmountPaise)}
                    </td>

                    {/* Paid Tender */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                      {formatINR(item.totalPaidPaise)}
                      {item.variancePaise !== 0 && (
                        <div
                          className={`text-[10px] font-bold ${
                            item.variancePaise > 0 ? "text-emerald-700" : "text-rose-700"
                          }`}
                        >
                          {item.variancePaise > 0 ? "+ " : ""}{formatINR(item.variancePaise)}
                        </div>
                      )}
                    </td>

                    {/* Payment Method / Ref */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#172B25]">{item.primaryMethod}</div>
                      {item.payments[0]?.razorpayPaymentId && (
                        <div className="font-mono text-[10px] text-[#718078]">
                          {item.payments[0].razorpayPaymentId}
                        </div>
                      )}
                    </td>

                    {/* Audit Status */}
                    <td className="py-3 px-4">
                      {item.reconciliationStatus === "MATCHED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Matched
                        </span>
                      )}
                      {item.reconciliationStatus === "DISCREPANCY" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                          <AlertTriangle className="h-3 w-3" /> Discrepancy
                        </span>
                      )}
                      {item.reconciliationStatus === "UNPAID" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                          Unpaid Bill
                        </span>
                      )}
                      {item.reconciliationStatus === "REFUNDED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                          <RotateCcw className="h-3 w-3" /> Refunded
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      {item.reconciliationStatus === "DISCREPANCY" && isOwnerOrManager && (
                        <button
                          onClick={() => setResolvingItem(item)}
                          className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-amber-700"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve Discrepancy Modal */}
      {resolvingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative flex w-full max-w-md flex-col rounded-2xl border border-[#E5EBE7] bg-white shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#16845B]" />
                <h2 className="text-base font-bold text-[#172B25]">
                  Resolve Payment Discrepancy
                </h2>
              </div>
              <button
                onClick={() => setResolvingItem(null)}
                className="rounded-lg p-1.5 text-[#718078] hover:bg-[#F2F5F3] hover:text-[#172B25]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3 space-y-1.5">
                <div className="font-bold text-sm text-[#172B25]">
                  Order #{resolvingItem.orderNumber}
                </div>
                <div className="flex justify-between text-[#718078]">
                  <span>Bill Subtotal:</span>
                  <span className="font-mono text-[#172B25]">{formatINR(resolvingItem.billAmountPaise)}</span>
                </div>
                <div className="flex justify-between text-[#718078]">
                  <span>Paid Tender:</span>
                  <span className="font-mono text-emerald-800">{formatINR(resolvingItem.totalPaidPaise)}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-700 border-t border-[#E5EBE7] pt-1">
                  <span>Variance Discrepancy:</span>
                  <span className="font-mono">{formatINR(resolvingItem.variancePaise)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">
                  Manager Explanation &amp; Resolution Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain resolution (e.g., customer paid partial tip in cash, rounding concession authorized, bank chargeback cleared)..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingResolution}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#16845B] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  <span>{submittingResolution ? "Resolving..." : "Authorize Resolution"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setResolvingItem(null)}
                  className="rounded-lg border border-[#E5EBE7] bg-white px-4 py-2.5 font-semibold text-[#172B25] hover:bg-[#F2F5F3]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
