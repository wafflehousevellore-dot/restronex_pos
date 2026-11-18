"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CreditCard,
  MessageSquare,
  Printer,
  ShoppingBag,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Play,
  RefreshCw,
  Lock,
  Wifi,
  Usb,
  Bluetooth,
  Send,
  Sparkles,
} from "lucide-react";

interface ConfigModalProps {
  provider: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  domainUrl?: string;
  outlets?: any[];
}

export default function IntegrationConfigModal({
  provider,
  isOpen,
  onClose,
  onSuccess,
  domainUrl,
  outlets = [],
}: ConfigModalProps) {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  // Razorpay states
  const [rzpKeyId, setRzpKeyId] = useState("");
  const [rzpKeySecret, setRzpKeySecret] = useState("");
  const [rzpWebhookSecret, setRzpWebhookSecret] = useState("");
  const [rzpMerchantName, setRzpMerchantName] = useState("");
  const [rzpAutoCapture, setRzpAutoCapture] = useState(true);

  // WhatsApp states
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waWabaId, setWaWabaId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waVerifyToken, setWaVerifyToken] = useState("restronex_wa_verify_token_prod");
  const [waTestPhone, setWaTestPhone] = useState("");
  const [waSendingTest, setWaSendingTest] = useState(false);

  // Printer states
  const [printerName, setPrinterName] = useState("Main Cashier Printer");
  const [printerType, setPrinterType] = useState<"NETWORK_LAN" | "USB_THERMAL" | "BLUETOOTH_THERMAL">("NETWORK_LAN");
  const [printerIp, setPrinterIp] = useState("192.168.1.100");
  const [printerPort, setPrinterPort] = useState("9100");
  const [printerPaper, setPrinterPaper] = useState<"80mm" | "58mm">("80mm");
  const [printerStation, setPrinterStation] = useState<"BILLING" | "MAIN" | "BEVERAGE">("BILLING");
  const [printerOutletId, setPrinterOutletId] = useState("");

  // Aggregator states (Swiggy / Zomato)
  const [aggMerchantId, setAggMerchantId] = useState("");
  const [aggStoreId, setAggStoreId] = useState("");
  const [aggApiKey, setAggApiKey] = useState("");
  const [aggWebhookSecret, setAggWebhookSecret] = useState("");

  // Accounting states (Tally)
  const [tallyFormat, setTallyFormat] = useState<"TALLY_XML" | "ZOHO_BOOKS" | "CSV">("TALLY_XML");
  const [salesLedger, setSalesLedger] = useState("Restaurant Food Sales");
  const [cgstLedger, setCgstLedger] = useState("Output CGST 9%");
  const [sgstLedger, setSgstLedger] = useState("Output SGST 9%");

  const origin = domainUrl || (typeof window !== "undefined" ? window.location.origin : "https://www.restronexpos.com");

  useEffect(() => {
    if (!isOpen) return;
    setMsg(null);
    if (outlets.length > 0 && !printerOutletId) {
      setPrinterOutletId(outlets[0].id);
    }

    // Preload current configuration
    if (provider === "razorpay") {
      fetch("/api/settings/payments")
        .then((r) => r.json())
        .then((d) => {
          if (d.keyId) setRzpKeyId(d.keyId);
          if (d.merchantName) setRzpMerchantName(d.merchantName);
          if (d.autoCapture !== undefined) setRzpAutoCapture(d.autoCapture);
        })
        .catch(() => {});
    } else if (provider === "whatsapp") {
      fetch("/api/whatsapp/config")
        .then((r) => r.json())
        .then((d) => {
          if (d.displayPhone) setWaTestPhone(d.displayPhone);
        })
        .catch(() => {});
    }
  }, [isOpen, provider, outlets, printerOutletId]);

  if (!isOpen) return null;

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2500);
  };

  // Save Razorpay
  const handleSaveRazorpay = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "RAZORPAY",
          keyId: rzpKeyId.trim(),
          keySecret: rzpKeySecret.trim() || undefined,
          webhookSecret: rzpWebhookSecret.trim() || undefined,
          merchantName: rzpMerchantName.trim() || undefined,
          autoCapture: rzpAutoCapture,
          isEnabled: true,
          cashEnabled: true,
          cardTerminalEnabled: true,
          upiManualEnabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify credentials with Razorpay");
      setMsg({ type: "success", text: "✓ Razorpay credentials verified & saved securely." });
      setRzpKeySecret("");
      onSuccess();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Test WhatsApp message ping
  const handleSendWhatsAppTest = async () => {
    if (!waTestPhone || waTestPhone.trim().length < 10) {
      return setMsg({ type: "error", text: "Enter a valid recipient mobile number with country code (e.g. +91 98765 43210)" });
    }
    setWaSendingTest(true);
    setMsg(null);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isTest: true,
          testPhone: waTestPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to contact Meta WhatsApp endpoint");
      setMsg({ type: "success", text: `✓ Test message dispatched via Meta Cloud API! ID: ${data.messageId || "Sent"}` });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setWaSendingTest(false);
    }
  };

  // Save Printer
  const handleSavePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/printers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: printerName.trim(),
          type: printerType,
          paperWidth: printerPaper,
          connectionString: printerType === "NETWORK_LAN" ? `${printerIp.trim()}:${printerPort.trim()}` : "DIRECT_USB",
          station: printerStation,
          outletId: printerOutletId || undefined,
          isDefaultBilling: printerStation === "BILLING",
          isDefaultKOT: printerStation !== "BILLING",
          autoPrintEnabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register printer");
      setMsg({ type: "success", text: `✓ Printer "${printerName}" configured successfully.` });
      onSuccess();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Save Aggregator (Swiggy / Zomato)
  const handleSaveAggregator = async (aggProvider: "SWIGGY" | "ZOMATO") => {
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/integrations/aggregator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_connection",
          provider: aggProvider,
          credentials: {
            apiKey: aggApiKey.trim(),
            merchantId: aggMerchantId.trim(),
            webhookSecret: aggWebhookSecret.trim(),
            environment: "production",
          },
          testMode: false,
          autoAccept: true,
          defaultPrepMinutes: 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to save ${aggProvider} configuration`);
      setMsg({ type: "success", text: `✓ ${aggProvider} settings saved. Awaiting official aggregator partner activation.` });
      onSuccess();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Export Tally XML
  const handleExportAccounting = async () => {
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "accounting",
          action: "export_accounting",
          exportFormat: tallyFormat,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");

      // Trigger browser file download
      const blob = new Blob([data.exportPayload], { type: "application/xml;charset=utf-8" });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = data.filename || `RestroNex_Tally_${Date.now()}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMsg({
        type: "success",
        text: `✓ Downloaded ${data.summary?.orderCount || 0} orders totaling ₹${((data.summary?.totalSalesPaise || 0) / 100).toFixed(2)}.`,
      });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#16845B] flex items-center justify-center font-bold">
              {provider === "razorpay" && <CreditCard className="w-5 h-5" />}
              {provider === "whatsapp" && <MessageSquare className="w-5 h-5" />}
              {provider === "printer" && <Printer className="w-5 h-5" />}
              {(provider === "swiggy" || provider === "zomato") && <ShoppingBag className="w-5 h-5" />}
              {provider === "accounting" && <FileSpreadsheet className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#172B25]">
                {provider === "razorpay" && "Configure Razorpay Payment Gateway"}
                {provider === "whatsapp" && "Configure Meta WhatsApp Business API"}
                {provider === "printer" && "Add Thermal Receipt / KOT Printer"}
                {provider === "swiggy" && "Configure Swiggy Partner Bridge"}
                {provider === "zomato" && "Configure Zomato Partner Bridge"}
                {provider === "accounting" && "Export Accounting Data (Tally Prime)"}
              </h3>
              <p className="text-xs text-gray-500">Live Production Integration • AES-256-GCM Encrypted</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Banner */}
        {msg && (
          <div
            className={`px-5 py-3 border-b text-xs font-semibold flex items-center gap-2 ${
              msg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : msg.type === "error"
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
          >
            {msg.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {msg.type === "error" && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* RAZORPAY CONFIG */}
          {provider === "razorpay" && (
            <form onSubmit={handleSaveRazorpay} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">Production Webhook Callback URL:</span>
                  <button
                    type="button"
                    onClick={() => copyText(`${origin}/api/webhooks/razorpay`, "rzp_webhook")}
                    className="text-[11px] font-bold text-[#16845B] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedLabel === "rzp_webhook" ? "Copied!" : "Copy URL"}
                  </button>
                </div>
                <div className="text-xs font-mono bg-white p-2 rounded-lg border border-gray-200 text-gray-800 break-all">
                  {origin}/api/webhooks/razorpay
                </div>
                <p className="text-[11px] text-gray-500">
                  Configure this in Razorpay Dashboard → Settings → Webhooks. Subscribe to: <code>payment.captured</code>, <code>payment.failed</code>, <code>order.paid</code>.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">
                  Razorpay Key ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="rzp_live_..."
                  value={rzpKeyId}
                  onChange={(e) => setRzpKeyId(e.target.value)}
                  required
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#16845B] focus:border-transparent outline-none"
                />
                <span className="text-[11px] text-gray-500">From Razorpay Dashboard → Settings → API Keys</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">
                  Razorpay Key Secret <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter your live Key Secret"
                  value={rzpKeySecret}
                  onChange={(e) => setRzpKeySecret(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#16845B] focus:border-transparent outline-none"
                />
                <span className="text-[11px] text-gray-500">Encrypted server-side using AES-256-GCM. Verified via live API ping before saving.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Webhook Signing Secret</label>
                <input
                  type="password"
                  placeholder="Secret entered when creating Razorpay Webhook"
                  value={rzpWebhookSecret}
                  onChange={(e) => setRzpWebhookSecret(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#16845B] focus:border-transparent outline-none"
                />
                <span className="text-[11px] text-gray-500">Enforces cryptographic HMAC-SHA256 signature verification on every event.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Merchant Business Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Waffle Plum House"
                  value={rzpMerchantName}
                  onChange={(e) => setRzpMerchantName(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#16845B] focus:border-transparent outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
                <div>
                  <div className="text-xs font-bold text-gray-800">Auto-Capture Payments</div>
                  <div className="text-[11px] text-gray-500">Instantly capture authorized transactions without manual settlement approval</div>
                </div>
                <input
                  type="checkbox"
                  checked={rzpAutoCapture}
                  onChange={(e) => setRzpAutoCapture(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#16845B]"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading || !rzpKeyId}
                className="w-full py-2.5 rounded-xl bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Verify &amp; Save Live Razorpay Gateway
              </button>
            </form>
          )}

          {/* WHATSAPP CONFIG */}
          {provider === "whatsapp" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">Meta Webhook Callback URL:</span>
                  <button
                    type="button"
                    onClick={() => copyText(`${origin}/api/webhooks/whatsapp`, "wa_webhook")}
                    className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedLabel === "wa_webhook" ? "Copied!" : "Copy URL"}
                  </button>
                </div>
                <div className="text-xs font-mono bg-white p-2 rounded-lg border border-emerald-200 text-emerald-950 break-all">
                  {origin}/api/webhooks/whatsapp
                </div>
                <p className="text-[11px] text-emerald-800">
                  Verify Token: <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200">restronex_wa_verify_token_prod</code>
                </p>
              </div>

              {/* Live Test Trigger Card */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3">
                <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-[#16845B]" />
                  Live Real-Time Notification Test (Meta Cloud API)
                </div>
                <p className="text-[11px] text-gray-600">
                  Send a live verification message to confirm WhatsApp delivery to your mobile phone.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter phone with country code (e.g. +91 98765 43210)"
                    value={waTestPhone}
                    onChange={(e) => setWaTestPhone(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-300 bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSendWhatsAppTest}
                    disabled={waSendingTest}
                    className="px-4 py-2 rounded-lg bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {waSendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    Send Test Ping
                  </button>
                </div>
              </div>

              <div className="pt-2 text-center">
                <a
                  href="/app/settings/whatsapp"
                  className="text-xs font-bold text-[#16845B] hover:underline inline-flex items-center gap-1"
                >
                  Open Full WhatsApp Meta Embedded Signup &amp; Template Manager →
                </a>
              </div>
            </div>
          )}

          {/* THERMAL PRINTER CONFIG */}
          {provider === "printer" && (
            <form onSubmit={handleSavePrinter} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Printer Name / Station Label</label>
                <input
                  type="text"
                  placeholder="e.g. Main Cashier 80mm or Kitchen Hot Food"
                  value={printerName}
                  onChange={(e) => setPrinterName(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#16845B] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Connection Interface</label>
                  <select
                    value={printerType}
                    onChange={(e) => setPrinterType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  >
                    <option value="NETWORK_LAN">Network LAN / Ethernet (IP Socket 9100)</option>
                    <option value="USB_THERMAL">Direct USB (Browser WebUSB)</option>
                    <option value="BLUETOOTH_THERMAL">Bluetooth Mobile Printer</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Paper Width</label>
                  <select
                    value={printerPaper}
                    onChange={(e) => setPrinterPaper(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  >
                    <option value="80mm">80mm (3-inch Standard Bill)</option>
                    <option value="58mm">58mm (2-inch Compact Slip)</option>
                  </select>
                </div>
              </div>

              {printerType === "NETWORK_LAN" && (
                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-gray-700">Printer IP Address</label>
                    <input
                      type="text"
                      placeholder="192.168.1.100"
                      value={printerIp}
                      onChange={(e) => setPrinterIp(e.target.value)}
                      required
                      className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-300 bg-white"
                    />
                    <span className="text-[10px] text-gray-500">From self-test feed diagnostic print</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700">Port</label>
                    <input
                      type="text"
                      placeholder="9100"
                      value={printerPort}
                      onChange={(e) => setPrinterPort(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-300 bg-white"
                    />
                    <span className="text-[10px] text-gray-500">Default: 9100</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Station Routing Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "BILLING", label: "Billing Counter" },
                    { key: "MAIN", label: "Hot Kitchen KOT" },
                    { key: "BEVERAGE", label: "Bar / Cold KOT" },
                  ].map((st) => (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setPrinterStation(st.key as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        printerStation === st.key
                          ? "bg-emerald-50 border-[#16845B] text-[#16845B] ring-1 ring-[#16845B]"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {outlets.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Assign to Branch Outlet</label>
                  <select
                    value={printerOutletId}
                    onChange={(e) => setPrinterOutletId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 bg-white"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                Save &amp; Activate Printer Station
              </button>
            </form>
          )}

          {/* AGGREGATORS (SWIGGY & ZOMATO) CONFIG */}
          {(provider === "swiggy" || provider === "zomato") && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  Provider Commercial Approval Required
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  Direct API order push requires an active merchant agreement with{" "}
                  <strong>{provider === "swiggy" ? "Swiggy" : "Zomato"}</strong>. Once your partner account manager enables
                  POS Relay, enter your credentials below to establish live ingestion.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">
                    {provider === "swiggy" ? "Swiggy Webhook URL" : "Zomato Webhook URL"}:
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        `${origin}/api/webhooks/aggregators/${provider}`,
                        `${provider}_webhook`
                      )
                    }
                    className="text-[11px] font-bold text-[#16845B] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedLabel === `${provider}_webhook` ? "Copied!" : "Copy URL"}
                  </button>
                </div>
                <div className="text-xs font-mono bg-white p-2 rounded-lg border border-gray-200 text-gray-800 break-all">
                  {origin}/api/webhooks/aggregators/{provider}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Merchant / Partner ID</label>
                  <input
                    type="text"
                    placeholder={provider === "swiggy" ? "SWG-MERCHANT-8492" : "ZOM-RES-19284012"}
                    value={aggMerchantId}
                    onChange={(e) => setAggMerchantId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Partner API Key / Token</label>
                  <input
                    type="password"
                    placeholder="Enter partner token provided by support"
                    value={aggApiKey}
                    onChange={(e) => setAggApiKey(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Webhook Signing Secret</label>
                <input
                  type="password"
                  placeholder="Cryptographic HMAC secret"
                  value={aggWebhookSecret}
                  onChange={(e) => setAggWebhookSecret(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-gray-300"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveAggregator(provider.toUpperCase() as any)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Credentials
                </button>

                <a
                  href="/app/integrations/online"
                  className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition flex items-center gap-1.5"
                >
                  Outlet Mapping &amp; Menu Sync Console →
                </a>
              </div>
            </div>
          )}

          {/* ACCOUNTING EXPORT */}
          {provider === "accounting" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 space-y-1 text-xs text-purple-900">
                <div className="font-bold flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-purple-700" />
                  Direct Accounting Ledger Export
                </div>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Export verified daily sales, output taxes (CGST 9% + SGST 9%), tender reconciliation (Cash, UPI, Cards), and day-end registers formatted for instant import into TallyPrime or Zoho Books.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Target Export Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTallyFormat("TALLY_XML")}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      tallyFormat === "TALLY_XML"
                        ? "bg-purple-50 border-purple-600 text-purple-900 ring-1 ring-purple-600"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-extrabold">Tally Prime XML</div>
                    <div className="text-[10px] text-gray-500 font-normal mt-0.5">Ready for Import Data &gt; Vouchers</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTallyFormat("CSV")}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      tallyFormat === "CSV"
                        ? "bg-purple-50 border-purple-600 text-purple-900 ring-1 ring-purple-600"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-extrabold">Universal CSV / Excel</div>
                    <div className="text-[10px] text-gray-500 font-normal mt-0.5">Zoho Books &amp; Spreadsheet Analysis</div>
                  </button>
                </div>
              </div>

              {tallyFormat === "TALLY_XML" && (
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                  <div className="font-bold text-gray-700">Tally Ledger Mappings</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-gray-500 block">SALES LEDGER</span>
                      <input
                        type="text"
                        value={salesLedger}
                        onChange={(e) => setSalesLedger(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-300 bg-white font-medium"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">CGST LEDGER</span>
                      <input
                        type="text"
                        value={cgstLedger}
                        onChange={(e) => setCgstLedger(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-300 bg-white font-medium"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">SGST LEDGER</span>
                      <input
                        type="text"
                        value={sgstLedger}
                        onChange={(e) => setSgstLedger(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-300 bg-white font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleExportAccounting}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                Generate &amp; Download Today&apos;s Accounting Vouchers
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
