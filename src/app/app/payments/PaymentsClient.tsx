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
  RotateCcw,
  QrCode,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

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
  const [webhookSecret, setWebhookSecret] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [isGatewayEnabled, setIsGatewayEnabled] = useState(false);
  const [cashEnabled, setCashEnabled] = useState(true);
  const [cardTerminalEnabled, setCardTerminalEnabled] = useState(true);
  const [upiManualEnabled, setUpiManualEnabled] = useState(true);
  const [savingGateway, setSavingGateway] = useState(false);
  const [gatewayMsg, setGatewayMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // PhonePe Gateway state (Option 1)
  const [gatewaySubTab, setGatewaySubTab] = useState<"PHONEPE" | "DIRECT_UPI" | "RAZORPAY">("PHONEPE");
  const [phonepeMid, setPhonepeMid] = useState("PGTESTPAYUAT86");
  const [phonepeSaltKey, setPhonepeSaltKey] = useState("");
  const [phonepeSaltIndex, setPhonepeSaltIndex] = useState("1");
  const [savingPhonePe, setSavingPhonePe] = useState(false);

  // Direct Dynamic UPI QR state (Option 2)
  const [upiId, setUpiId] = useState("ajaydpi2005@ptyes");
  const [savingUpi, setSavingUpi] = useState(false);

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
        const prov = c.provider || "PHONEPE";
        setGatewaySubTab(
          prov === "RAZORPAY" ? "RAZORPAY" : prov === "DIRECT_UPI" ? "DIRECT_UPI" : "PHONEPE"
        );
        setPhonepeMid(c.phonepeMid || "PGTESTPAYUAT86");
        setPhonepeSaltIndex(c.phonepeSaltIndex || "1");
        setUpiId(c.upiId || c.keyId || "ajaydpi2005@ptyes");
        setKeyId(c.keyId || "");
        setMerchantName(c.merchantName || "WAFFLE PLUM HOUSE");
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

  async function handleSavePhonePe(e: React.FormEvent) {
    e.preventDefault();
    setSavingPhonePe(true);
    setGatewayMsg(null);

    try {
      const res = await fetch("/api/settings/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "PHONEPE",
          phonepeMid: phonepeMid.trim() || "PGTESTPAYUAT86",
          phonepeSaltKey: phonepeSaltKey.trim() || undefined,
          phonepeSaltIndex: phonepeSaltIndex.trim() || "1",
          merchantName: merchantName.trim() || "WAFFLE PLUM HOUSE",
          isEnabled: true,
          cashEnabled,
          cardTerminalEnabled,
          upiManualEnabled: true,
        }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to save PhonePe settings");

      setGatewayMsg({
        type: "success",
        text: "✓ PhonePe Payment Gateway (0% Fee, Auto-Verified) activated successfully!",
      });
      setPhonepeSaltKey("");
      await loadData();
    } catch (err: any) {
      setGatewayMsg({ type: "error", text: err.message || "Failed to save PhonePe settings." });
    } finally {
      setSavingPhonePe(false);
    }
  }

  async function handleSaveDirectUpi(e: React.FormEvent) {
    e.preventDefault();
    if (!upiId.trim()) {
      return setGatewayMsg({ type: "error", text: "Please enter your UPI ID (VPA)." });
    }
    setSavingUpi(true);
    setGatewayMsg(null);

    try {
      const res = await fetch("/api/settings/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "DIRECT_UPI",
          upiId: upiId.trim(),
          merchantName: merchantName.trim() || "WAFFLE PLUM HOUSE",
          isEnabled: true,
          cashEnabled,
          cardTerminalEnabled,
          upiManualEnabled: true,
        }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to save UPI settings");

      setGatewayMsg({ type: "success", text: "✓ Direct Dynamic UPI QR (0% Fee) activated successfully!" });
      await loadData();
    } catch (err: any) {
      setGatewayMsg({ type: "error", text: err.message || "Failed to save UPI settings." });
    } finally {
      setSavingUpi(false);
    }
  }

  async function handleSaveGateway(e: React.FormEvent) {
    e.preventDefault();
    setSavingGateway(true);
    setGatewayMsg(null);

    try {
      const res = await fetch("/api/settings/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "RAZORPAY",
          keyId,
          keySecret: keySecret || undefined,
          webhookSecret: webhookSecret || undefined,
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
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Method Switcher */}
          <div className="flex rounded-full border border-[#E5EBE7] bg-white p-1 max-w-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setGatewaySubTab("PHONEPE")}
              className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                gatewaySubTab === "PHONEPE"
                  ? "bg-[#16845B] text-white shadow-xs"
                  : "text-[#718078] hover:text-[#172B25]"
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              ⚡ PhonePe Gateway (0% Fee - Auto Verified)
            </button>
            <button
              type="button"
              onClick={() => setGatewaySubTab("DIRECT_UPI")}
              className={`py-2 px-3 rounded-full text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                gatewaySubTab === "DIRECT_UPI"
                  ? "bg-[#16845B] text-white shadow-xs"
                  : "text-[#718078] hover:text-[#172B25]"
              }`}
            >
              <QrCode className="h-3.5 w-3.5" />
              Direct UPI
            </button>
            <button
              type="button"
              onClick={() => setGatewaySubTab("RAZORPAY")}
              className={`py-2 px-3 rounded-full text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                gatewaySubTab === "RAZORPAY"
                  ? "bg-[#16845B] text-white shadow-xs"
                  : "text-[#718078] hover:text-[#172B25]"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              Razorpay
            </button>
          </div>

          {gatewayMsg && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                gatewayMsg.type === "success"
                  ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <span>{gatewayMsg.text}</span>
              <button type="button" onClick={() => setGatewayMsg(null)} className="px-1 font-bold">
                ×
              </button>
            </div>
          )}

          {gatewaySubTab === "PHONEPE" ? (
            /* Option 1: Official PhonePe Payment Gateway (0% Commission, Auto-Verified) */
            <Card className="bg-white border-[#E5EBE7] shadow-sm">
              <CardHeader className="border-b border-[#E5EBE7] pb-4 bg-gradient-to-r from-[#F8FAF9] to-[#E8F5EE]/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-[#172B25] flex items-center gap-2">
                    <Zap className="h-5 w-5 text-[#16845B]" />
                    PhonePe Payment Gateway (Official Hermes PG v1)
                  </CardTitle>
                  <span className="text-[11px] font-black px-3 py-1 rounded-full border bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]">
                    0% COMMISSION • AUTO-VERIFIED
                  </span>
                </div>
                <p className="text-xs text-[#718078] mt-1">
                  100% automatic verification for <b>Table QR Ordering</b> and active dining bills with <b>0% middleman fees</b>. Diners pay seamlessly with PhonePe, Google Pay, Paytm, UPI Intent, or Cards, and payments verify automatically with PhonePe secure cryptographic callbacks.
                </p>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="p-3 bg-[#E8F5EE] border border-[#16845B]/30 rounded-xl text-xs text-[#16845B] font-bold flex items-center justify-between">
                  <span>🟢 Table Ordering & Online Billing: AUTO-VERIFY ACTIVE</span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-[#16845B]/30">PhonePe PG v1</span>
                </div>

                <form onSubmit={handleSavePhonePe} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B25]">
                      PhonePe Merchant ID (MID) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. M1234567890 (Your PhonePe Business MID)"
                      value={phonepeMid}
                      onChange={(e) => setPhonepeMid(e.target.value)}
                      required
                      className="bg-white border-[#E5EBE7] text-xs h-9 font-mono font-bold"
                    />
                    <div className="text-[10px] text-[#718078]">
                      Enter your live PhonePe Business Merchant ID (MID) from your PhonePe merchant console.
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B25]">PhonePe Salt Key / API Secret</Label>
                    <Input
                      type="password"
                      placeholder={
                        gatewayConfig?.hasPhonepeSecret
                          ? "•••••••••••••••• (Encrypted on Server)"
                          : "Enter Production Salt Key"
                      }
                      value={phonepeSaltKey}
                      onChange={(e) => setPhonepeSaltKey(e.target.value)}
                      className="bg-white border-[#E5EBE7] text-xs h-9 font-mono"
                    />
                    <div className="text-[10px] text-[#718078]">
                      Encrypted with AES-256-GCM. Provided by PhonePe Business Dashboard.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[#172B25]">PhonePe Salt Index</Label>
                      <Input
                        value={phonepeSaltIndex}
                        onChange={(e) => setPhonepeSaltIndex(e.target.value)}
                        className="bg-white border-[#E5EBE7] text-xs h-9 font-bold"
                      />
                      <div className="text-[10px] text-[#718078]">Usually <code>1</code> for PhonePe PG.</div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[#172B25]">Merchant Payee Name</Label>
                      <Input
                        value={merchantName}
                        onChange={(e) => setMerchantName(e.target.value)}
                        className="bg-white border-[#E5EBE7] text-xs h-9 font-bold"
                      />
                      <div className="text-[10px] text-[#718078]">Restaurant display name.</div>
                    </div>
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
                        <span>Direct Dynamic UPI</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-3">
                    <Button
                      type="submit"
                      disabled={savingPhonePe}
                      className="w-full bg-[#16845B] hover:bg-[#116B49] text-white rounded-full font-bold text-xs h-10 shadow-xs cursor-pointer"
                    >
                      {savingPhonePe ? "Activating PhonePe..." : "⚡ Save & Activate PhonePe (0% Fee, Auto-Verified)"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : gatewaySubTab === "DIRECT_UPI" ? (
            /* Option 2: Direct Dynamic UPI QR */
            <Card className="bg-white border-[#E5EBE7] shadow-sm">
              <CardHeader className="border-b border-[#E5EBE7] pb-4 bg-gradient-to-r from-[#F8FAF9] to-[#E8F5EE]/40">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-[#172B25] flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-[#16845B]" />
                    Direct Dynamic UPI QR (Zero Fee Option)
                  </CardTitle>
                  <span className="text-[11px] font-black px-3 py-1 rounded-full border bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]">
                    0% COMMISSION
                  </span>
                </div>
                <p className="text-xs text-[#718078] mt-1">
                  All customer payments go <b>100% directly into your bank account instantly</b> via Google Pay, PhonePe, Paytm, or BHIM. RestroNex powers <b>instant 1-tap mobile UPI payments for Table QR ordering</b>, customer while-dining bill settlement, POS dynamic QR codes, and 58mm thermal printed bills. Zero setup friction, 0% gateway fee!
                </p>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="p-3 bg-[#E8F5EE] border border-[#16845B]/30 rounded-xl text-xs text-[#16845B] font-bold flex items-center justify-between">
                  <span>🟢 Table QR Ordering & Dining Online Payment: ACTIVE</span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-[#16845B]/30">GPay • PhonePe • Paytm</span>
                </div>
                <form onSubmit={handleSaveDirectUpi} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B25]">
                      Business UPI ID / VPA <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. 9513008467@upi or wafflehouse@okhdfcbank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      required
                      className="bg-white border-[#E5EBE7] text-xs h-9 font-mono font-bold"
                    />
                    <div className="text-[10px] text-[#718078]">
                      Found in your Google Pay, PhonePe, Paytm Business, or bank mobile app profile.
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B25]">Merchant Payee Display Name</Label>
                    <Input
                      placeholder="WAFFLE PLUM HOUSE"
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      className="bg-white border-[#E5EBE7] text-xs h-9 font-bold"
                    />
                    <div className="text-[10px] text-[#718078]">
                      The restaurant name displayed on customer UPI apps upon scanning.
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] flex flex-col sm:flex-row items-center gap-4">
                    <div className="bg-white p-2 rounded-xl border border-[#E5EBE7] shrink-0 shadow-xs">
                      <QRCodeSVG
                        value={`upi://pay?pa=${upiId || "ajaydpi2005@ptyes"}&pn=${encodeURIComponent(
                          merchantName || "WAFFLE PLUM HOUSE"
                        )}&am=100.00&cu=INR&tn=Sample%20Bill`}
                        size={112}
                        level="M"
                        includeMargin={false}
                        className="mx-auto"
                      />
                    </div>
                    <div className="text-xs text-[#718078] space-y-1">
                      <div className="font-bold text-[#172B25] flex items-center gap-1.5 text-xs">
                        <CheckCircle2 className="h-4 w-4 text-[#16845B]" />
                        Live Test QR Code Preview
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Scan with your PhonePe, Google Pay, or Paytm app right now to test. The payment will route directly to <b>{upiId || "your UPI ID"}</b>.
                      </p>
                      <div className="text-[10px] font-mono text-[#16845B] pt-0.5">
                        Amount: ₹100.00 (Test) • Direct Bank Settlement
                      </div>
                    </div>
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
                        <span>Direct Dynamic UPI QR</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-3">
                    <Button
                      type="submit"
                      disabled={savingUpi}
                      className="w-full bg-[#16845B] hover:bg-[#116B49] text-white rounded-full font-bold text-xs h-10 shadow-xs cursor-pointer"
                    >
                      {savingUpi ? "Saving UPI Settings..." : "⚡ Save & Activate Direct Dynamic UPI QR (0% Fee)"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            /* Razorpay Gateway Card */
            <Card className="bg-white border-[#E5EBE7] shadow-sm">
              <CardHeader className="border-b border-[#E5EBE7] pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-[#172B25] flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#16845B]" />
                    Direct Razorpay Merchant Integration
                  </CardTitle>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      gatewayConfig?.isEnabled && gatewayConfig?.provider === "RAZORPAY"
                        ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                        : "bg-[#F8FAF9] border-[#E5EBE7] text-[#718078]"
                    }`}
                  >
                    {gatewayConfig?.isEnabled && gatewayConfig?.provider === "RAZORPAY" ? "Gateway Active" : "Optional"}
                  </span>
                </div>
                <p className="text-xs text-[#718078] mt-1">
                  Optional: If you wish to accept online cards and netbanking via Razorpay.
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
                      placeholder="rzp_live_..."
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
                      placeholder={gatewayConfig?.hasSecret ? "•••••••••••••••• (Encrypted on Server)" : "Enter Live Key Secret"}
                      value={keySecret}
                      onChange={(e) => setKeySecret(e.target.value)}
                      className="bg-white border-[#E5EBE7] text-xs h-9 font-mono"
                    />
                    <div className="text-[10px] text-[#718078]">
                      Stored securely using AES-256-GCM encryption. Never exposed to browser.
                    </div>
                  </div>

                  {/* Production Webhook URL Card */}
                  <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7] space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-[#172B25]">Razorpay Webhook Endpoint</Label>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/razorpay`;
                          navigator.clipboard.writeText(url);
                          setGatewayMsg({ type: "success", text: "Webhook URL copied to clipboard!" });
                        }}
                        className="text-[11px] font-bold text-[#16845B] hover:underline cursor-pointer"
                      >
                        Copy URL
                      </button>
                    </div>
                    <div className="text-xs font-mono bg-white p-2 rounded border border-[#E5EBE7] text-[#172B25] break-all">
                      {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/razorpay` : "https://www.restronexpos.com/api/webhooks/razorpay"}
                    </div>
                    <div className="text-[10px] text-[#718078]">
                      Paste this in Razorpay Dashboard → Settings → Webhooks. Subscribe to: <code>payment.captured</code>, <code>payment.failed</code>, <code>order.paid</code>.
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#172B25]">Webhook Signing Secret</Label>
                    <Input
                      type="password"
                      placeholder="Secret configured in your Razorpay Webhook settings"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      className="bg-white border-[#E5EBE7] text-xs h-9 font-mono"
                    />
                    <div className="text-[10px] text-[#718078]">Used for cryptographic HMAC-SHA256 signature verification.</div>
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

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={savingGateway}
                      className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold py-2.5 shadow-xs"
                    >
                      {savingGateway ? "Verifying Credentials with Razorpay..." : "Save & Verify Razorpay Credentials"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
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

