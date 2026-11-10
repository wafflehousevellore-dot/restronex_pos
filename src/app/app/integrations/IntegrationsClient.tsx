"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  INTEGRATIONS,
  getIntegrationMeta,
  statusLabel,
  IntegrationProvider,
  IntegrationStatus,
  IntegrationConfigData,
} from "@/lib/integrations";
import {
  Check,
  CheckCircle2,
  RefreshCw,
  Phone,
  Building2,
  Store,
  ShieldCheck,
  AlertCircle,
  Copy,
  Printer,
  FileSpreadsheet,
  QrCode,
  Unplug,
  KeyRound,
  Smartphone,
  Send,
} from "lucide-react";

export default function IntegrationsClient() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [_tenant, setTenant] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider>("swiggy");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Form states
  const [phone, setPhone] = useState("");
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [merchantName, setMerchantName] = useState("");

  // OTP states for Direct Mobile & OTP Integration
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sentOtpCode, setSentOtpCode] = useState<string | null>(null);
  const [showEditPhone, setShowEditPhone] = useState(false);

  // Printer specific states
  const [printerIp, setPrinterIp] = useState("192.168.1.100");
  const [printerPort, setPrinterPort] = useState("9100");
  const [printerStation, setPrinterStation] = useState("MAIN");
  const [printerPaper, setPrinterPaper] = useState("80mm");

  // Accounting specific states
  const [exportFormat, setExportFormat] = useState("TALLY_XML");

  const loadData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || []);
        setOutlets(data.outlets || []);
        setTenant(data.tenant || null);

        if (data.outlets && data.outlets.length > 0 && !selectedOutletId) {
          setSelectedOutletId(data.outlets[0].id);
          setMerchantName(data.outlets[0].name);
        }
      }
    } catch (err) {
      console.error("Failed to load integrations:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedOutletId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Find active config for selected provider
  const currentConfig = configs.find((c) => c.provider === selectedProvider);
  const currentData: IntegrationConfigData = useMemo(() => currentConfig?.data || {}, [currentConfig]);
  const currentStatus: IntegrationStatus = currentConfig?.status || "NOT_CONNECTED";
  const meta = getIntegrationMeta(selectedProvider)!;
  const statusInfo = statusLabel(currentStatus);

  // Pre-fill fields when selecting an integration
  useEffect(() => {
    setMsg(null);
    setOtp("");
    setShowEditPhone(false);
    if (currentData) {
      if (currentData.registeredPhone) setPhone(currentData.registeredPhone);
      if (currentData.providerStoreId) setStoreId(currentData.providerStoreId);
      if (currentData.outletId) setSelectedOutletId(currentData.outletId);
      if (currentData.merchantName) setMerchantName(currentData.merchantName);
      if (currentData.otpCode) {
        setSentOtpCode(currentData.otpCode);
        setOtp(currentData.otpCode);
        setOtpSent(true);
      } else {
        setSentOtpCode(null);
        setOtpSent(false);
      }
      if (currentData.printerIp) setPrinterIp(currentData.printerIp);
      if (currentData.printerPort) setPrinterPort(String(currentData.printerPort));
      if (currentData.printerStation) setPrinterStation(currentData.printerStation);
      if (currentData.exportFormat) setExportFormat(currentData.exportFormat);
    }
  }, [selectedProvider, currentConfig, currentData]);

  // Handle Send OTP Action (Direct Mobile Integration)
  async function handleSendOtp(phoneOverride?: string) {
    const targetPhone = phoneOverride || phone || currentData.registeredPhone;
    if (!targetPhone || targetPhone.replace(/\D/g, "").length < 10) {
      setMsg({ type: "error", text: "Please enter a valid 10-digit mobile number." });
      return;
    }

    setActionLoading(true);
    setMsg(null);

    try {
      const res = await apiFetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          action: "send_otp",
          registeredPhone: targetPhone,
          outletId: selectedOutletId,
          merchantName: merchantName || undefined,
          providerStoreId: storeId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send verification OTP.");

      setOtpSent(true);
      if (data.otp) {
        setSentOtpCode(data.otp);
        setOtp(data.otp);
      }
      setShowEditPhone(false);

      setMsg({
        type: "success",
        text: data.message || `OTP sent to +91 ${data.registeredPhone || targetPhone}. Enter code below.`,
      });

      await loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to send OTP." });
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Verify OTP Action (Direct Instant Connect)
  async function handleVerifyOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanOtp = String(otp || "").trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setMsg({ type: "error", text: "Please enter the 6-digit verification code." });
      return;
    }

    setActionLoading(true);
    setMsg(null);

    try {
      const res = await apiFetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          action: "verify_otp",
          otp: cleanOtp,
          registeredPhone: phone || currentData.registeredPhone,
          outletId: selectedOutletId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed. Please check the code.");

      setMsg({
        type: "success",
        text: data.message || `✓ ${meta.name} successfully connected! Live order sync is active.`,
      });

      setOtp("");
      setOtpSent(false);
      setSentOtpCode(null);
      await loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "OTP verification failed." });
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Connect Action (Zero API Keys needed for Swiggy/Zomato)
  async function handleConnect(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setActionLoading(true);
    setMsg(null);

    try {
      const payload: any = {
        provider: selectedProvider,
        action: "connect",
        outletId: selectedOutletId,
        merchantName: merchantName || undefined,
      };

      if (meta.connectionMode === "PARTNER_ONBOARDING") {
        payload.registeredPhone = phone;
        payload.providerStoreId = storeId || undefined;
      } else if (meta.connectionMode === "DEVICE_LAN") {
        payload.printerIp = printerIp;
        payload.printerPort = printerPort;
        payload.printerStation = printerStation;
        payload.printerPaper = printerPaper;
      } else if (meta.connectionMode === "DATA_EXPORT") {
        payload.exportFormat = exportFormat;
      }

      const res = await apiFetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection request failed.");

      setMsg({
        type: data.status === "CONNECTED" ? "success" : "info",
        text: data.message || `Connection request recorded for ${meta.name}.`,
      });

      await loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to initiate connection." });
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Verify Action (Honest check against partner APIs)
  async function handleVerify() {
    setActionLoading(true);
    setMsg(null);

    try {
      const res = await apiFetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          action: "verify",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification test failed.");

      if (data.status === "CONNECTED") {
        setMsg({
          type: "success",
          text: `✓ ${meta.name} successfully verified! Live incoming order sync is active.`,
        });
      } else {
        setMsg({
          type: "info",
          text: data.message || "Partner approval required. Your restaurant connection request has been recorded.",
        });
      }

      await loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Verification test failed." });
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Disconnect
  async function handleDisconnect() {
    if (!confirm(`Are you sure you want to disconnect ${meta.name}? Real-time order sync will be stopped.`)) {
      return;
    }

    setActionLoading(true);
    setMsg(null);

    try {
      const res = await apiFetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          action: "disconnect",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disconnect.");

      setMsg({
        type: "info",
        text: `Disconnected ${meta.name}. Connection status is now DISCONNECTED.`,
      });

      await loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to disconnect." });
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Menu Catalog Push to Swiggy/Zomato
  async function handlePushMenu() {
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await apiFetch("/api/integrations/menu-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          action: "push_menu",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync menu.");
      setMsg({ type: "success", text: data.message });
      await loadData();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Tally Export Download
  async function handleDownloadTallyXml() {
    setActionLoading(true);
    try {
      const res = await apiFetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "accounting",
          action: "export_accounting",
          exportFormat,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to export.");

      // Trigger file download in browser
      const blob = new Blob([data.exportPayload], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename || `RestroNex_Tally_${new Date().toISOString().slice(0, 10)}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMsg({
        type: "success",
        text: `✓ Downloaded today's reconciliation for ${data.summary.orderCount} orders totaling ₹${(
          data.summary.totalSalesPaise / 100
        ).toFixed(2)}.`,
      });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const appBaseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.restronexpos.com";

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#172B25] tracking-tight">
            Integrations & Marketplaces
          </h1>
          <p className="text-sm text-[#718078] mt-0.5">
            Connect Swiggy, Zomato, QR menus, and hardware without manually entering API keys. Honest status tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white border border-[#E5EBE7] px-3.5 py-1 text-xs text-[#718078] font-bold shadow-xs">
            {configs.filter((c) => c.status === "CONNECTED").length} Connected •{" "}
            {configs.filter((c) => c.status === "PENDING_APPROVAL").length} Pending Review
          </span>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-full border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] shadow-xs"
            title="Refresh status"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {msg && (
        <div
          className={`rounded-2xl border p-4 text-xs font-semibold flex items-start gap-3 shadow-xs ${
            msg.type === "success"
              ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
              : msg.type === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-amber-50 border-amber-300 text-amber-900"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <div className="flex-1 leading-relaxed">{msg.text}</div>
        </div>
      )}

      {/* Main Grid: Left Provider Selector, Right Dynamic Action Panel */}
      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        {/* Left Side: Provider Cards */}
        <div className="space-y-3">
          {INTEGRATIONS.map((item) => {
            const cfg = configs.find((c) => c.provider === item.provider);
            const st: IntegrationStatus = cfg?.status || "NOT_CONNECTED";
            const isSel = selectedProvider === item.provider;
            const lbl = statusLabel(st);

            return (
              <button
                key={item.provider}
                type="button"
                onClick={() => setSelectedProvider(item.provider)}
                className={`w-full text-left rounded-2xl border p-4 transition cursor-pointer shadow-xs ${
                  isSel
                    ? "bg-[#E8F5EE]/60 border-[#16845B] ring-2 ring-[#16845B]/15"
                    : "bg-white border-[#E5EBE7] hover:bg-[#F8FAF9]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-9 w-9 rounded-xl grid place-items-center font-bold text-sm ${
                        item.provider === "swiggy"
                          ? "bg-[#FC8019]/10 text-[#FC8019]"
                          : item.provider === "zomato"
                          ? "bg-[#E23744]/10 text-[#E23744]"
                          : item.provider === "qr_ordering"
                          ? "bg-[#16845B]/10 text-[#16845B]"
                          : item.provider === "printer"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-emerald-50 text-[#16845B]"
                      }`}
                    >
                      {item.provider === "swiggy"
                        ? "🟠"
                        : item.provider === "zomato"
                        ? "🔴"
                        : item.provider === "qr_ordering"
                        ? "📱"
                        : item.provider === "printer"
                        ? "🖨️"
                        : "📊"}
                    </div>
                    <div>
                      <div className="text-sm font-black text-[#172B25]">{item.name}</div>
                      <div className="text-[11px] text-[#718078] font-medium">{item.tagline}</div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shrink-0 ${lbl.badgeClass}`}
                  >
                    {lbl.text}
                  </span>
                </div>
              </button>
            );
          })}

          <div className="p-4 rounded-2xl bg-[#E8F5EE]/40 border border-[#16845B]/20 text-xs text-[#16845B] space-y-1">
            <div className="font-extrabold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Zero-Credential Policy
            </div>
            <div className="text-[11px] text-[#172B25]/80 leading-relaxed">
              RestroNex never asks for third-party merchant passwords or secret tokens. Integrations are authorized via official platform partner protocols.
            </div>
          </div>
        </div>

        {/* Right Side: Configuration & Management Experience */}
        <div>
          <Card className="bg-white border-[#E5EBE7] shadow-sm">
            <CardHeader className="border-b border-[#E5EBE7] pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] grid place-items-center text-2xl">
                    {meta.provider === "swiggy"
                      ? "🟠"
                      : meta.provider === "zomato"
                      ? "🔴"
                      : meta.provider === "qr_ordering"
                      ? "📱"
                      : meta.provider === "printer"
                      ? "🖨️"
                      : "📊"}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-[#172B25] flex items-center gap-2">
                      <span>{meta.name}</span>
                      <span className="text-xs font-normal text-[#718078]">• {meta.category}</span>
                    </CardTitle>
                    <p className="text-xs text-[#718078] mt-0.5">{meta.tagline}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full border uppercase tracking-wider ${statusInfo.badgeClass}`}
                  >
                    {statusInfo.text}
                  </span>
                </div>
              </div>

              <div className="text-xs text-[#718078] mt-3 leading-relaxed">
                {meta.description}
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* ========================================================================= */}
              {/* CASE 1: SWIGGY & ZOMATO ONBOARDING FLOW                                   */}
              {/* ========================================================================= */}
              {meta.connectionMode === "PARTNER_ONBOARDING" && (
                <>
                  {/* DIRECT MOBILE + OTP ONBOARDING (WHEN NOT CONNECTED) */}
                  {currentStatus !== "CONNECTED" && (
                    <div className="space-y-6">
                      <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-2">
                        <div className="text-xs font-extrabold text-[#172B25] flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Smartphone className="h-4 w-4 text-[#16845B]" /> Direct Mobile & OTP Integration
                          </span>
                          <span className="text-[10px] bg-[#E8F5EE] text-[#16845B] font-bold px-2.5 py-0.5 rounded-full border border-[#16845B]/20">
                            Instant Setup
                          </span>
                        </div>
                        <p className="text-xs text-[#718078] leading-relaxed">
                          Enter your registered merchant mobile number. A 6-digit verification OTP will authenticate and connect your restaurant directly to {meta.name}. No manual partner portal authorization needed.
                        </p>
                      </div>

                      {/* Step 1: Mobile Number & Store Info */}
                      <div className="p-5 rounded-2xl bg-white border border-[#E5EBE7] space-y-4">
                        <div className="text-xs font-black text-[#172B25] uppercase tracking-wider flex items-center justify-between">
                          <span>1. Merchant Account Details</span>
                          {(currentStatus === "PENDING_APPROVAL" || currentStatus === "AUTHENTICATION_PENDING" || otpSent) && !showEditPhone && (
                            <button
                              type="button"
                              onClick={() => setShowEditPhone(true)}
                              className="text-[11px] font-bold text-[#16845B] hover:underline cursor-pointer"
                            >
                              Edit Phone Number
                            </button>
                          )}
                        </div>

                        {/* If Phone is already recorded and not in edit mode */}
                        {(currentStatus === "PENDING_APPROVAL" || currentStatus === "AUTHENTICATION_PENDING" || otpSent) && !showEditPhone ? (
                          <div className="grid sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] text-xs">
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-[#718078] font-semibold uppercase">Registered Phone</span>
                              <div className="font-bold text-[#172B25] flex items-center gap-1.5 font-mono">
                                <Phone className="h-3.5 w-3.5 text-[#16845B]" /> +91 {phone || currentData.registeredPhone}
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-[#718078] font-semibold uppercase">Linked Outlet</span>
                              <div className="font-bold text-[#172B25] flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-[#16845B]" />
                                {outlets.find((o) => o.id === selectedOutletId)?.name || "Main Counter"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                              {/* Registered Phone */}
                              <div>
                                <Label className="text-xs font-bold text-[#172B25] flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5 text-[#16845B]" /> Registered Merchant Phone *
                                </Label>
                                <div className="mt-1.5 flex rounded-xl border border-[#E5EBE7] bg-white focus-within:border-[#16845B]">
                                  <span className="inline-flex items-center px-3 border-r border-[#E5EBE7] text-xs font-bold text-[#718078] bg-[#F8FAF9] rounded-l-xl">
                                    +91
                                  </span>
                                  <Input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                    placeholder="9876543210"
                                    maxLength={10}
                                    required
                                    className="border-0 focus-visible:ring-0 text-xs font-bold text-[#172B25]"
                                  />
                                </div>
                                <p className="text-[11px] text-[#718078] mt-1">
                                  10-digit number registered with {meta.name}
                                </p>
                              </div>

                              {/* Outlet Selector */}
                              <div>
                                <Label className="text-xs font-bold text-[#172B25] flex items-center gap-1">
                                  <Building2 className="h-3.5 w-3.5 text-[#16845B]" /> RestroNex Outlet to Link *
                                </Label>
                                <select
                                  value={selectedOutletId}
                                  onChange={(e) => {
                                    setSelectedOutletId(e.target.value);
                                    const out = outlets.find((o) => o.id === e.target.value);
                                    if (out) setMerchantName(out.name);
                                  }}
                                  className="mt-1.5 w-full rounded-xl border border-[#E5EBE7] bg-white p-2.5 text-xs font-bold text-[#172B25] focus:border-[#16845B] focus:outline-none"
                                  required
                                >
                                  {outlets.map((o) => (
                                    <option key={o.id} value={o.id}>
                                      {o.name} {o.city ? `(${o.city})` : ""}
                                    </option>
                                  ))}
                                </select>
                                <p className="text-[11px] text-[#718078] mt-1">
                                  Incoming orders will route directly to this outlet
                                </p>
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                              {/* Store ID (Optional) */}
                              <div>
                                <Label className="text-xs font-bold text-[#172B25] flex items-center gap-1">
                                  <Store className="h-3.5 w-3.5 text-[#718078]" /> {meta.name} Store ID (Optional)
                                </Label>
                                <Input
                                  value={storeId}
                                  onChange={(e) => setStoreId(e.target.value)}
                                  placeholder={meta.provider === "swiggy" ? "e.g. 862333" : "e.g. 1892341"}
                                  className="mt-1.5 bg-white border-[#E5EBE7] text-xs font-bold text-[#172B25]"
                                />
                              </div>

                              {/* Restaurant Brand Name */}
                              <div>
                                <Label className="text-xs font-bold text-[#172B25]">Restaurant Brand Name</Label>
                                <Input
                                  value={merchantName}
                                  onChange={(e) => setMerchantName(e.target.value)}
                                  placeholder="Restaurant Name"
                                  className="mt-1.5 bg-white border-[#E5EBE7] text-xs font-bold text-[#172B25]"
                                />
                              </div>
                            </div>

                            {!otpSent && currentStatus === "NOT_CONNECTED" && (
                              <div className="pt-2">
                                <Button
                                  type="button"
                                  onClick={() => handleSendOtp()}
                                  disabled={actionLoading || !phone || phone.length < 10}
                                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white font-bold text-xs px-6 py-2.5 shadow-xs transition"
                                >
                                  <Send className="h-3.5 w-3.5 mr-1.5" />
                                  {actionLoading ? "Sending OTP..." : `Send Verification OTP`}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Step 2: 6-Digit OTP Verification Card */}
                      <div className="p-5 rounded-2xl bg-white border border-[#E5EBE7] space-y-4">
                        <div className="text-xs font-black text-[#172B25] uppercase tracking-wider flex items-center gap-1.5">
                          <KeyRound className="h-4 w-4 text-[#16845B]" />
                          <span>2. Enter 6-Digit Mobile Verification OTP</span>
                        </div>

                        <div className="p-4 rounded-xl bg-[#E8F5EE]/50 border border-[#16845B]/20 text-xs text-[#172B25] space-y-2">
                          <div className="font-bold flex items-center justify-between">
                            <span>Verification code sent to +91 {phone || currentData.registeredPhone}</span>
                            <button
                              type="button"
                              onClick={() => handleSendOtp()}
                              disabled={actionLoading}
                              className="text-[11px] font-bold text-[#16845B] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className={`h-3 w-3 ${actionLoading ? "animate-spin" : ""}`} /> Resend OTP
                            </button>
                          </div>
                          {(sentOtpCode || currentData.otpCode) && (
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-[11px] text-[#718078]">Instant Test / Preview Code:</span>
                              <button
                                type="button"
                                onClick={() => setOtp(sentOtpCode || currentData.otpCode || "")}
                                className="px-2.5 py-0.5 rounded-md bg-[#16845B] text-white font-mono font-bold text-xs hover:bg-[#116B49] transition cursor-pointer"
                                title="Click to fill OTP"
                              >
                                {sentOtpCode || currentData.otpCode} (Click to Auto-fill)
                              </button>
                            </div>
                          )}
                        </div>

                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                          <div className="max-w-xs">
                            <Label className="text-xs font-bold text-[#172B25]">
                              6-Digit Verification Code *
                            </Label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={6}
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="123456"
                              required
                              className="mt-1.5 bg-white border-[#E5EBE7] text-xl font-mono font-black tracking-widest text-center h-12 focus:border-[#16845B]"
                            />
                            <p className="text-[11px] text-[#718078] mt-1">
                              Enter the 6-digit SMS / WhatsApp OTP or test code
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Button
                              type="submit"
                              disabled={actionLoading || otp.trim().length < 4}
                              className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white font-bold text-xs px-6 py-2.5 shadow-xs transition"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1.5" />
                              {actionLoading ? "Verifying..." : `Verify OTP & Connect ${meta.name}`}
                            </Button>

                            <Button
                              type="button"
                              onClick={() => handleSendOtp()}
                              disabled={actionLoading}
                              variant="outline"
                              className="rounded-full border-[#E5EBE7] bg-white text-[#172B25] hover:bg-[#F8FAF9] font-bold text-xs px-5 py-2.5 shadow-xs"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${actionLoading ? "animate-spin" : ""}`} /> Resend OTP
                            </Button>

                            {currentStatus !== "NOT_CONNECTED" && (
                              <Button
                                type="button"
                                onClick={handleDisconnect}
                                disabled={actionLoading}
                                variant="outline"
                                className="rounded-full border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs px-5 py-2.5 shadow-xs"
                              >
                                <Unplug className="h-3.5 w-3.5 mr-1.5" /> Cancel / Reset
                              </Button>
                            )}
                          </div>
                        </form>
                      </div>

                      {/* Webhook Endpoint Info */}
                      <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-[#172B25]">
                            Registered Webhook URL (For {meta.name} POS Gateway)
                          </Label>
                          <button
                            type="button"
                            onClick={() =>
                              copyWebhookUrl(
                                currentData.webhookUrl || `${appBaseUrl}${meta.webhookPath}`
                              )
                            }
                            className="text-xs font-bold text-[#16845B] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                            {copiedWebhook ? "Copied ✓" : "Copy URL"}
                          </button>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-[#E5EBE7] font-mono text-xs text-[#172B25] select-all break-all">
                          {currentData.webhookUrl || `${appBaseUrl}${meta.webhookPath}`}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* State C: CONNECTED */}
                  {currentStatus === "CONNECTED" && (
                    <div className="space-y-6">
                      <div className="p-4 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/30 text-[#16845B] flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-extrabold text-sm">
                            Official {meta.name} Integration Active
                          </div>
                          <div className="text-xs text-[#172B25]/80 mt-0.5 leading-relaxed">
                            Orders placed on {meta.name} are delivered in real-time, auto-printed on kitchen tickets (KOT), and ingredients are deducted from your inventory BOM.
                          </div>
                        </div>
                      </div>

                      {/* Live Sync Capabilities */}
                      <div>
                        <div className="text-xs font-black text-[#172B25] uppercase tracking-wider mb-3">
                          Verified Synchronization Capabilities
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] text-xs space-y-1">
                            <div className="text-[11px] font-bold text-[#16845B]">● Active</div>
                            <div className="font-black text-[#172B25]">Incoming Orders</div>
                            <div className="text-[10px] text-[#718078]">Real-time Webhook</div>
                          </div>
                          <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] text-xs space-y-1">
                            <div className="text-[11px] font-bold text-[#16845B]">● Active</div>
                            <div className="font-black text-[#172B25]">Kitchen KOT Firing</div>
                            <div className="text-[10px] text-[#718078]">Instant routing</div>
                          </div>
                          <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] text-xs space-y-1">
                            <div className="text-[11px] font-bold text-[#16845B]">● Active</div>
                            <div className="font-black text-[#172B25]">Menu Availability</div>
                            <div className="text-[10px] text-[#718078]">86 Item Toggles</div>
                          </div>
                          <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] text-xs space-y-1">
                            <div className="text-[11px] font-bold text-[#16845B]">● Active</div>
                            <div className="font-black text-[#172B25]">Rider Updates</div>
                            <div className="text-[10px] text-[#718078]">Live Dispatch Status</div>
                          </div>
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Button
                          onClick={handlePushMenu}
                          disabled={actionLoading}
                          className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white font-bold text-xs px-5 py-2.5 shadow-xs"
                        >
                          <RefreshCw className="h-4 w-4 mr-1.5" /> Push Live Menu Catalog
                        </Button>

                        <Button
                          onClick={handleVerify}
                          disabled={actionLoading}
                          variant="outline"
                          className="rounded-full border-[#E5EBE7] bg-white text-[#172B25] hover:bg-[#F8FAF9] font-bold text-xs px-5 py-2.5 shadow-xs"
                        >
                          Run Webhook Handshake Test
                        </Button>

                        <Button
                          onClick={handleDisconnect}
                          disabled={actionLoading}
                          variant="outline"
                          className="rounded-full border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs px-5 py-2.5 shadow-xs"
                        >
                          <Unplug className="h-4 w-4 mr-1.5" /> Disconnect
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ========================================================================= */}
              {/* CASE 2: QR CONTACTLESS ORDERING FLOW                                      */}
              {/* ========================================================================= */}
              {meta.connectionMode === "ONE_CLICK" && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/30 text-[#16845B] space-y-1">
                    <div className="font-extrabold text-sm flex items-center gap-1.5">
                      <QrCode className="h-4 w-4" /> Zero-Credential Contactless Table Menu
                    </div>
                    <p className="text-xs text-[#172B25]/80 leading-relaxed">
                      QR Ordering is built directly into RestroNex. Guests scan table tokens, view dish photos, and place food orders.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-[#172B25]">Active Restaurant Outlet</Label>
                      <select
                        value={selectedOutletId}
                        onChange={(e) => setSelectedOutletId(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-[#E5EBE7] bg-white p-2.5 text-xs font-bold text-[#172B25] focus:border-[#16845B] focus:outline-none"
                      >
                        {outlets.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B25]">Sample Table QR Token Menu</Label>
                      <div className="mt-1.5 flex gap-2">
                        <Input
                          readOnly
                          value={`${appBaseUrl}/order/table/tbl_koramangala_t01`}
                          className="bg-[#F8FAF9] border-[#E5EBE7] text-xs font-mono text-[#718078]"
                        />
                        <a
                          href={`${appBaseUrl}/order/table/tbl_koramangala_t01`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl bg-[#172B25] text-white text-xs font-bold shrink-0 grid place-items-center"
                        >
                          Preview ↗
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      onClick={() => handleConnect()}
                      disabled={actionLoading}
                      className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white font-bold text-xs px-6 py-2.5 shadow-xs"
                    >
                      <Check className="h-4 w-4 mr-1.5" /> Enable QR Engine for All Tables
                    </Button>

                    <a
                      href="/app/tables"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E5EBE7] bg-white px-5 py-2.5 text-xs font-bold text-[#172B25] hover:bg-[#F8FAF9] shadow-xs"
                    >
                      <QrCode className="h-4 w-4 text-[#16845B]" /> Manage Dining Tables & Floor Plan
                    </a>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* CASE 3: LOCAL THERMAL PRINTER CONFIGURATION                               */}
              {/* ========================================================================= */}
              {meta.connectionMode === "DEVICE_LAN" && (
                <form onSubmit={handleConnect} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] text-xs text-[#718078] leading-relaxed">
                    Enter the local IPv4 address of your thermal printer (ESC/POS compatible). Ensure your tablet/POS is on the same Wi-Fi router.
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-[#172B25]">Printer LAN IPv4 Address *</Label>
                      <Input
                        value={printerIp}
                        onChange={(e) => setPrinterIp(e.target.value)}
                        placeholder="192.168.1.100"
                        required
                        className="mt-1.5 bg-white border-[#E5EBE7] text-xs font-mono font-bold text-[#172B25]"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B25]">LAN Port</Label>
                      <Input
                        value={printerPort}
                        onChange={(e) => setPrinterPort(e.target.value)}
                        placeholder="9100"
                        className="mt-1.5 bg-white border-[#E5EBE7] text-xs font-mono font-bold text-[#172B25]"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-[#172B25]">Assigned Station</Label>
                      <select
                        value={printerStation}
                        onChange={(e) => setPrinterStation(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-[#E5EBE7] bg-white p-2.5 text-xs font-bold text-[#172B25] focus:border-[#16845B] focus:outline-none"
                      >
                        <option value="MAIN">Kitchen (Main Hot Food)</option>
                        <option value="BEVERAGE">Bar & Beverages</option>
                        <option value="DESSERT">Bakery & Desserts</option>
                        <option value="BILLING">Billing Counter (Customer Receipt)</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B25]">Thermal Paper Width</Label>
                      <select
                        value={printerPaper}
                        onChange={(e) => setPrinterPaper(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-[#E5EBE7] bg-white p-2.5 text-xs font-bold text-[#172B25] focus:border-[#16845B] focus:outline-none"
                      >
                        <option value="80mm">80mm Standard (3-inch)</option>
                        <option value="58mm">58mm Compact (2-inch)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white font-bold text-xs px-6 py-2.5 shadow-xs"
                    >
                      <Printer className="h-4 w-4 mr-1.5" /> Save & Connect Printer
                    </Button>

                    <Button
                      type="button"
                      onClick={handleVerify}
                      disabled={actionLoading}
                      variant="outline"
                      className="rounded-full border-[#E5EBE7] bg-white text-[#172B25] hover:bg-[#F8FAF9] font-bold text-xs px-5 py-2.5 shadow-xs"
                    >
                      Send Test Print Ping
                    </Button>
                  </div>
                </form>
              )}

              {/* ========================================================================= */}
              {/* CASE 4: ACCOUNTING & ERP EXPORT (TALLY XML / CSV)                         */}
              {/* ========================================================================= */}
              {meta.connectionMode === "DATA_EXPORT" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] text-xs text-[#718078] leading-relaxed">
                    Export your day-end registers, tax ledgers, and payment tender splits directly into format-compliant XML or CSV for Tally Prime and Zoho Books.
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold text-[#172B25]">Export Format</Label>
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-[#E5EBE7] bg-white p-2.5 text-xs font-bold text-[#172B25] focus:border-[#16845B] focus:outline-none"
                      >
                        <option value="TALLY_XML">Tally Prime XML (Standard Vouchers)</option>
                        <option value="ZOHO_BOOKS">Zoho Books Journal Format</option>
                        <option value="CSV">General Ledger Excel / CSV</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-[#172B25]">Reconciliation Schedule</Label>
                      <select
                        defaultValue="DAILY_DAY_END"
                        className="mt-1.5 w-full rounded-xl border border-[#E5EBE7] bg-white p-2.5 text-xs font-bold text-[#172B25] focus:border-[#16845B] focus:outline-none"
                      >
                        <option value="DAILY_DAY_END">Daily at Day-End Closing</option>
                        <option value="MANUAL">On-Demand Download</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      onClick={handleDownloadTallyXml}
                      disabled={actionLoading}
                      className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white font-bold text-xs px-6 py-2.5 shadow-xs"
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                      {actionLoading ? "Generating..." : "Download Today's Tally Export (.XML)"}
                    </Button>

                    <Button
                      onClick={() => handleConnect()}
                      disabled={actionLoading}
                      variant="outline"
                      className="rounded-full border-[#E5EBE7] bg-white text-[#172B25] hover:bg-[#F8FAF9] font-bold text-xs px-5 py-2.5 shadow-xs"
                    >
                      Save Export Schedule
                    </Button>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* CASE 5: GENERIC ORDERING CHANNEL ADAPTER (DOTPE / THRIVE)                 */}
              {/* ========================================================================= */}
              {meta.connectionMode === "WEBHOOK_ADAPTER" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] text-xs text-[#718078] leading-relaxed">
                    Provide your generic channel webhook URL to receive orders from DotPe, Thrive, or custom branded web stores.
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-[#E5EBE7] space-y-1.5">
                    <Label className="text-xs font-bold text-[#172B25]">RestroNex Incoming Webhook URL</Label>
                    <div className="p-2.5 rounded-xl bg-[#F8FAF9] font-mono text-xs text-[#172B25] select-all break-all">
                      {`${appBaseUrl}/api/webhooks/orders`}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
