"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import {
  CreditCard,
  ShieldCheck,
  Banknote,
  Smartphone,
  RefreshCw,
  Search,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowUpRight,
} from "lucide-react";

export default function PaymentsClient() {
  const [activeTab, setActiveTab] = useState<"TRANSACTIONS" | "GATEWAY_CONFIG">("TRANSACTIONS");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [gatewayConfig, setGatewayConfig] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");

  // Gateway form state
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [isGatewayEnabled, setIsGatewayEnabled] = useState(false);
  const [cashEnabled, setCashEnabled] = useState(true);
  const [cardTerminalEnabled, setCardTerminalEnabled] = useState(true);
  const [upiManualEnabled, setUpiManualEnabled] = useState(true);
  const [savingGateway, setSavingGateway] = useState(false);
  const [gatewayMsg, setGatewayMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Refund modal state
  const [refundingPayment, setRefundingPayment] = useState<any>(null);
  const [refundAmountPaise, setRefundAmountPaise] = useState<number>(0);
  const [refundReason, setRefundReason] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [resPayments, resConfig] = await Promise.all([
        fetch("/api/payments"),
        fetch("/api/settings/payments"),
      ]);

      if (resPayments.ok) {
        const j = await resPayments.json();
        setData(j);
      }

      if (resConfig.ok) {
        const c = await resConfig.json();
        setGatewayConfig(c);
        setKeyId(c.keyId || "");
        setMerchantName(c.merchantName || "");
        setIsGatewayEnabled(c.isEnabled || false);
        setCashEnabled(c.cashEnabled ?? true);
        setCardTerminalEnabled(c.cardTerminalEnabled ?? true);
        setUpiManualEnabled(c.upiManualEnabled ?? true);
      }
    } catch (err) {
      console.error("Failed to load payment data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSaveGateway(e: React.FormEvent) {
    e.preventDefault();
    setSavingGateway(true);
    setGatewayMsg(null);

    try {
      const res = await fetch("/api/settings/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyId,
          keySecret: keySecret || undefined,
          merchantName,
          isEnabled: isGatewayEnabled,
          cashEnabled,
          cardTerminalEnabled,
          upiManualEnabled,
        }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to save gateway config");

      setGatewayMsg({ type: "success", text: "✓ Razorpay credentials verified and saved securely." });
      setKeySecret("");
      loadData();
    } catch (err: any) {
      setGatewayMsg({ type: "error", text: err.message });
    } finally {
      setSavingGateway(false);
    }
  }

  async function handleProcessRefund() {
    if (!refundingPayment) return;
    setProcessingRefund(true);

    try {
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: refundingPayment.id,
          amountPaise: refundAmountPaise,
          reason: refundReason || "Customer refund",
        }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Refund processing failed");

      setRefundingPayment(null);
      loadData();
    } catch (err: any) {
      alert(`Refund Error: ${err.message}`);
    } finally {
      setProcessingRefund(false);
    }
  }

  const metrics = data?.metrics || {
    totalSalesPaise: 0,
    netSalesPaise: 0,
    onlineGatewayPaise: 0,
    cashPaise: 0,
    cardTerminalPaise: 0,
    upiManualPaise: 0,
    totalSuccessfulCount: 0,
    totalRefundsPaise: 0,
  };

  const payments = (data?.payments || []).filter((p: any) => {
    const matchesSearch =
      !search ||
      p.order?.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      p.reference?.toLowerCase().includes(search.toLowerCase());

    const matchesMethod =
      methodFilter === "ALL" ||
      (methodFilter === "ONLINE" && (p.method === "RAZORPAY_ONLINE" || p.isGatewayConfirmed)) ||
      (methodFilter === "CASH" && p.method === "CASH") ||
      (methodFilter === "TERMINAL" && (p.method === "EXTERNAL_CARD" || p.method === "CARD")) ||
      (methodFilter === "UPI" && (p.method === "UPI" || p.method === "MANUAL_UPI"));

    return matchesSearch && matchesMethod;
  });

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Payments & Settlements</h1>
          <p className="text-sm text-[#718078]">
            Multi-channel revenue ledger, direct merchant gateway isolation, and verified settlements.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl border-[#E5EBE7] bg-white text-xs font-semibold hover:bg-[#F8FAF9]"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Financial Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase">Net Revenue</div>
            <div className="text-xl font-black text-[#16845B] mt-1">{formatINR(metrics.netSalesPaise)}</div>
            <div className="text-[10px] text-[#718078] mt-0.5">{metrics.totalSuccessfulCount} total transactions</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase flex items-center justify-between">
              <span>Razorpay</span>
              <ShieldCheck className="h-3.5 w-3.5 text-[#16845B]" />
            </div>
            <div className="text-xl font-black text-[#172B25] mt-1">{formatINR(metrics.onlineGatewayPaise)}</div>
            <div className="text-[10px] text-[#16845B] font-semibold mt-0.5">Direct to Bank</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase flex items-center justify-between">
              <span>Cash</span>
              <Banknote className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="text-xl font-black text-[#172B25] mt-1">{formatINR(metrics.cashPaise)}</div>
            <div className="text-[10px] text-[#718078] mt-0.5">Counter collections</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase flex items-center justify-between">
              <span>Card Machine</span>
              <CreditCard className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <div className="text-xl font-black text-[#172B25] mt-1">{formatINR(metrics.cardTerminalPaise)}</div>
            <div className="text-[10px] text-[#718078] mt-0.5">External POS terminal</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase flex items-center justify-between">
              <span>Direct UPI</span>
              <Smartphone className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="text-xl font-black text-[#172B25] mt-1">{formatINR(metrics.upiManualPaise)}</div>
            <div className="text-[10px] text-[#718078] mt-0.5">Staff-verified VPA</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase flex items-center justify-between">
              <span>Refunds</span>
              <RotateCcw className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div className="text-xl font-black text-red-600 mt-1">{formatINR(metrics.totalRefundsPaise)}</div>
            <div className="text-[10px] text-[#718078] mt-0.5">{metrics.totalRefundsCount || 0} refunds settled</div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E5EBE7] gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("TRANSACTIONS")}
          className={`pb-3 transition border-b-2 cursor-pointer ${
            activeTab === "TRANSACTIONS"
              ? "border-[#16845B] text-[#16845B]"
              : "border-transparent text-[#718078] hover:text-[#172B25]"
          }`}
        >
          Payment Ledger & Transactions
        </button>
        <button
          onClick={() => setActiveTab("GATEWAY_CONFIG")}
          className={`pb-3 transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "GATEWAY_CONFIG"
              ? "border-[#16845B] text-[#16845B]"
              : "border-transparent text-[#718078] hover:text-[#172B25]"
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          Direct Merchant Gateway Credentials
          {gatewayConfig?.isEnabled && (
            <span className="h-2 w-2 rounded-full bg-[#16845B] ml-1" />
          )}
        </button>
      </div>

      {/* Tab 1: Transactions Ledger */}
      {activeTab === "TRANSACTIONS" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5EBE7] shadow-2xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#718078]" />
              <Input
                placeholder="Search by order number or payment reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                { label: "All Methods", val: "ALL" },
                { label: "Razorpay Online", val: "ONLINE" },
                { label: "Cash", val: "CASH" },
                { label: "Card Terminal", val: "TERMINAL" },
                { label: "UPI", val: "UPI" },
              ].map((f) => (
                <button
                  key={f.val}
                  onClick={() => setMethodFilter(f.val)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
                    methodFilter === f.val
                      ? "bg-[#16845B] text-white border-[#16845B]"
                      : "bg-[#F8FAF9] border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <Card className="bg-white border-[#E5EBE7] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[#718078] font-bold">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Reference / ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EBE7]">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#718078]">
                        No payment transactions match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-[#F8FAF9] transition">
                        <td className="py-3.5 px-4 font-bold text-[#172B25]">
                          {p.order?.orderNumber || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-[#718078]">
                          {p.order?.customerName || "Walk-in"}
                          {p.order?.customerPhone ? ` • ${p.order.customerPhone}` : ""}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-[#172B25] uppercase tracking-wider text-[11px]">
                            {p.method}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.isGatewayConfirmed ? (
                            <span className="inline-flex items-center gap-1 bg-[#E8F5EE] border border-[#16845B]/20 text-[#16845B] text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <ShieldCheck className="h-3 w-3" /> Gateway Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-[#F8FAF9] border border-[#E5EBE7] text-[#718078] text-[10px] font-medium px-2 py-0.5 rounded-full">
                              Staff Recorded
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#172B25]">
                          {formatINR(p.amountPaise)}
                          {p.refundedPaise > 0 && (
                            <div className="text-[10px] text-red-600 font-semibold">
                              Refunded: {formatINR(p.refundedPaise)}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#718078]">
                          {p.razorpayPaymentId || p.reference || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-[#718078]">
                          {new Date(p.createdAt).toLocaleString("en-IN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {p.status === "COMPLETED" && p.amountPaise > p.refundedPaise ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRefundingPayment(p);
                                setRefundAmountPaise(p.amountPaise - p.refundedPaise);
                                setRefundReason("");
                              }}
                              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 text-[11px] h-7 px-2.5"
                            >
                              Issue Refund
                            </Button>
                          ) : (
                            <span className="text-[11px] text-[#718078]">Settled</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Direct Merchant Gateway Setup */}
      {activeTab === "GATEWAY_CONFIG" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="bg-white border-[#E5EBE7] shadow-sm">
            <CardHeader className="border-b border-[#E5EBE7] pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-[#172B25] flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#16845B]" />
                  Direct Razorpay Merchant Integration
                </CardTitle>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    gatewayConfig?.isEnabled
                      ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                      : "bg-[#F8FAF9] border-[#E5EBE7] text-[#718078]"
                  }`}
                >
                  {gatewayConfig?.isEnabled ? "Gateway Active" : "Offline Only"}
                </span>
              </div>
              <p className="text-xs text-[#718078] mt-1">
                All food sales revenue goes <b>directly into your restaurant&apos;s bank account</b> through your own Razorpay credentials. RestroNex does not touch or pool your customer money.
              </p>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <form onSubmit={handleSaveGateway} className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7]">
                  <div>
                    <div className="text-xs font-bold text-[#172B25]">Enable Online Customer Payments</div>
                    <div className="text-[11px] text-[#718078]">Allow QR ordering and POS customers to pay via Razorpay</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isGatewayEnabled}
                    onChange={(e) => setIsGatewayEnabled(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#16845B]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#172B25]">
                    Razorpay Key ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="rzp_live_... or rzp_test_..."
                    value={keyId}
                    onChange={(e) => setKeyId(e.target.value)}
                    className="bg-white border-[#E5EBE7] text-xs h-9 font-mono"
                  />
                  <div className="text-[10px] text-[#718078]">Found in your Razorpay Dashboard → Settings → API Keys</div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#172B25]">
                    Razorpay Key Secret <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    placeholder={gatewayConfig?.hasSecret ? "•••••••••••••••• (Encrypted on Server)" : "Enter Key Secret"}
                    value={keySecret}
                    onChange={(e) => setKeySecret(e.target.value)}
                    className="bg-white border-[#E5EBE7] text-xs h-9 font-mono"
                  />
                  <div className="text-[10px] text-[#718078]">
                    Stored securely using AES-256-GCM encryption. Never exposed to browser.
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#172B25]">Merchant Display Name</Label>
                  <Input
                    placeholder="Your Restaurant Name"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    className="bg-white border-[#E5EBE7] text-xs h-9"
                  />
                </div>

                <div className="pt-2 border-t border-[#E5EBE7] space-y-2.5">
                  <div className="text-xs font-bold text-[#172B25]">Supported In-Person Tender Methods</div>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashEnabled}
                        onChange={(e) => setCashEnabled(e.target.checked)}
                        className="accent-[#16845B]"
                      />
                      <span>Cash at Counter</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cardTerminalEnabled}
                        onChange={(e) => setCardTerminalEnabled(e.target.checked)}
                        className="accent-[#16845B]"
                      />
                      <span>Card Machine</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={upiManualEnabled}
                        onChange={(e) => setUpiManualEnabled(e.target.checked)}
                        className="accent-[#16845B]"
                      />
                      <span>Direct Staff UPI</span>
                    </label>
                  </div>
                </div>

                {gatewayMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium border ${
                      gatewayMsg.type === "success"
                        ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                        : "bg-red-50 border-red-200 text-red-700"
                    }`}
                  >
                    {gatewayMsg.text}
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={savingGateway}
                    className="w-full rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold py-3 shadow-xs"
                  >
                    {savingGateway ? "Verifying Credentials with Razorpay..." : "Save & Verify Razorpay Credentials"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Refund Dialog Modal */}
      {refundingPayment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#E5EBE7] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-3">
              <h3 className="font-bold text-base text-[#172B25] flex items-center gap-1.5">
                <RotateCcw className="h-4 w-4 text-red-600" />
                Issue Payment Refund
              </h3>
              <button
                onClick={() => setRefundingPayment(null)}
                className="text-[#718078] hover:text-[#172B25]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7] space-y-1">
                <div><b>Order Number:</b> {refundingPayment.order?.orderNumber}</div>
                <div><b>Payment Method:</b> {refundingPayment.method}</div>
                <div><b>Max Refundable:</b> {formatINR(refundingPayment.amountPaise - refundingPayment.refundedPaise)}</div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#172B25]">Refund Amount (Paise / INR)</Label>
                <Input
                  type="number"
                  value={refundAmountPaise / 100}
                  onChange={(e) => setRefundAmountPaise(Math.round(Number(e.target.value) * 100))}
                  className="bg-white border-[#E5EBE7] text-xs h-9 mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#172B25]">Reason for Refund</Label>
                <Input
                  placeholder="e.g. Order cancelled, item unavailable"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="bg-white border-[#E5EBE7] text-xs h-9 mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5EBE7]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRefundingPayment(null)}
                className="rounded-xl border-[#E5EBE7] text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={processingRefund}
                onClick={handleProcessRefund}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                {processingRefund ? "Processing..." : `Confirm Refund of ${formatINR(refundAmountPaise)}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

