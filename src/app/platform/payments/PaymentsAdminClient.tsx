"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { CreditCard, Search, ArrowUpRight, RotateCcw, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function PaymentsAdminClient({
  initialPayments,
  summary,
}: {
  initialPayments: any[];
  summary: {
    totalCount: number;
    totalPaise: number;
    completedCount: number;
    completedPaise: number;
    refundPaise: number;
  };
}) {
  const [payments, setPayments] = useState(initialPayments);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const filtered = payments.filter((p) => {
    const matchesSearch =
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.providerPaymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.razorpayPaymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.subscription?.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleRefund(payment: any) {
    if (payment.status !== "COMPLETED") return;
    const reason = window.prompt(
      `Enter refund reason for ${payment.subscription?.tenant?.name} (${formatINR(payment.amountPaise)}):`,
      "Customer billing support request"
    );
    if (!reason) return;

    setBusyId(payment.id);
    setActionMsg(null);
    try {
      const res = await fetch("/api/platform/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PROCESS_REFUND",
          paymentId: payment.id,
          reason,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Refund processing failed");

      setPayments((prev) =>
        prev.map((item) => (item.id === payment.id ? { ...item, status: "REFUNDED" } : item))
      );
      setActionMsg(`✓ Refund processed for ${formatINR(payment.amountPaise)} (audit logged).`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#172B25]">SaaS Payments &amp; Transactions Ledger</h1>
          <p className="text-sm text-[#718078]">
            Transaction-level audit of all incoming SaaS subscription payments, gateway orders, and refunds.
          </p>
        </div>
        {actionMsg && (
          <span className="text-xs font-bold text-[#16845B] bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1.5 rounded-full">
            {actionMsg}
          </span>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#718078]">Total Volume Collected</span>
            <div className="text-2xl font-black text-[#16845B] mt-1">{formatINR(summary.completedPaise)}</div>
            <div className="text-xs text-[#718078] mt-1">{summary.completedCount} verified transactions</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#718078]">Total Payment Attempts</span>
            <div className="text-2xl font-black text-[#172B25] mt-1">{summary.totalCount}</div>
            <div className="text-xs text-[#718078] mt-1">Initiated via checkout &amp; renewals</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#718078]">Refunds Conceded</span>
            <div className="text-2xl font-black text-amber-700 mt-1">{formatINR(summary.refundPaise)}</div>
            <div className="text-xs text-[#718078] mt-1">Processed support refunds</div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718078]" />
          <input
            type="text"
            placeholder="Search by Payment ID, Razorpay Ref, or Restaurant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] text-xs font-medium text-[#172B25] placeholder:text-[#718078] focus:outline-hidden focus:border-[#16845B] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-[#F8FAF9] border border-[#E5EBE7] px-3 py-1.5 rounded-xl">
            <span className="text-[#718078] font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-[#172B25] focus:outline-hidden"
            >
              <option value="ALL">All Payments</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
          <div className="text-[#718078] font-semibold px-2">
            Showing {filtered.length} of {payments.length}
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[#718078] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Payment Reference</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#718078]">
                    No payments match the search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const refId = p.providerPaymentId || p.razorpayPaymentId || p.id;
                  return (
                    <tr key={p.id} className="hover:bg-[#F8FAF9]/80 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-[#718078]">
                        {new Date(p.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#172B25]">
                        {p.subscription?.tenant?.name || "Unknown Tenant"}
                      </td>
                      <td className="px-4 py-3 text-[#718078]">
                        {p.subscription?.plan?.name || "Direct"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#172B25]">
                        {refId}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-[#172B25]">
                        {formatINR(p.amountPaise)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            p.status === "COMPLETED"
                              ? "bg-[#E8F5EE] text-[#16845B]"
                              : p.status === "REFUNDED"
                              ? "bg-amber-100 text-amber-800"
                              : p.status === "FAILED"
                              ? "bg-red-100 text-red-700"
                              : "bg-[#F8FAF9] text-[#718078] border border-[#E5EBE7]"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === "COMPLETED" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-red-700 hover:text-red-900 hover:bg-red-50 font-bold"
                            disabled={busyId === p.id}
                            onClick={() => handleRefund(p)}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Refund
                          </Button>
                        ) : (
                          <span className="text-[#718078]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
