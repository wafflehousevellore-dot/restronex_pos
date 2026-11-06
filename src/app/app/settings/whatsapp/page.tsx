"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { MessageSquare, ShieldCheck, RefreshCw, ExternalLink } from "lucide-react";

export default function WhatsAppSettingsPage() {
  const [config, setConfig] = useState<any>({
    enabled: false,
    phoneNumberId: "",
    hasAccessToken: false,
    wabaId: "",
    templateName: "order_invoice_utility",
  });
  const [tokenInput, setTokenInput] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSendTest() {
    if (!testPhone || testPhone.trim().length < 10) {
      return setMsg({ type: "error", text: "Please enter a valid 10-digit mobile number for the test." });
    }
    setSendingTest(true);
    setMsg(null);
    try {
      const res = await apiFetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTest: true, testPhone }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: j.error || "Failed to send test message." });
      } else {
        setMsg({ type: "success", text: "✓ Test message sent successfully via WhatsApp Cloud API!" });
        loadData();
      }
    } catch {
      setMsg({ type: "error", text: "Network error sending test message." });
    } finally {
      setSendingTest(false);
    }
  }

  async function handleRetryLog(orderId: string) {
    if (!orderId) return;
    try {
      const res = await apiFetch("/api/whatsapp/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const j = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: `Retry dispatched! Current status: ${j.result?.status || "QUEUED"}` });
        loadData();
      } else {
        setMsg({ type: "error", text: j.error || "Retry failed." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error retrying delivery." });
    }
  }

  async function loadData() {
    try {
      const c = await apiFetch("/api/whatsapp/config").then((r) => r.json()).catch(() => ({}));
      setConfig(c);
      // Fetch recent logs from orders
      const o = await apiFetch("/api/orders").then((r) => r.json()).catch(() => []);
      if (Array.isArray(o)) {
        const extractedLogs = o.flatMap((ord: any) => ord.whatsAppLogs || []);
        setLogs(extractedLogs);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: config.enabled,
          phoneNumberId: config.phoneNumberId,
          accessToken: tokenInput || undefined,
          wabaId: config.wabaId,
          templateName: config.templateName,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: j.error || "Failed to save configuration" });
      } else {
        setMsg({ type: "success", text: "WhatsApp Cloud API credentials saved successfully!" });
        setTokenInput("");
        loadData();
      }
    } catch {
      setMsg({ type: "error", text: "Network error saving configuration" });
    }
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">WhatsApp Business Invoicing</h1>
          <p className="text-sm text-[#718078]">
            Official Meta Cloud API • Automated bill delivery on settlement • Utility templates
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 rounded-full border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] shadow-xs"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            msg.type === "success"
              ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)}>×</button>
        </div>
      )}

      {loading && (
        <div className="py-2 text-center text-xs font-semibold text-[#718078]">
          <RefreshCw className="h-3.5 w-3.5 animate-spin inline mr-1.5 text-[#16845B]" />
          Syncing WhatsApp Cloud API status…
        </div>
      )}

      {/* Meta API Settings Card */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5EBE7]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#E8F5EE] text-[#16845B]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold text-[#172B25]">
                  Meta WhatsApp Business Cloud API Configuration
                </CardTitle>
                <CardDescription className="text-xs text-[#718078]">
                  Zero scraper risk • Meta official enterprise messaging platform
                </CardDescription>
              </div>
            </div>
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-[#16845B] hover:underline inline-flex items-center gap-1"
            >
              Meta Docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <form onSubmit={saveConfig} className="space-y-4">
            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="h-4 w-4 rounded text-[#16845B] focus:ring-[#16845B]"
              />
              <div>
                <div className="text-xs font-bold text-[#172B25]">
                  Automatically deliver WhatsApp invoice upon bill settlement
                </div>
                <div className="text-[11px] text-[#718078]">
                  Triggered when POS cashier finalizes payment for Dine-in, Takeaway, or QR orders
                </div>
              </div>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-[#718078]">WhatsApp Phone Number ID</Label>
                <Input
                  value={config.phoneNumberId}
                  onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                  placeholder="e.g. 104857291827461"
                  className="bg-white border-[#E5EBE7] font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#718078]">WhatsApp Business Account ID (WABA)</Label>
                <Input
                  value={config.wabaId}
                  onChange={(e) => setConfig({ ...config, wabaId: e.target.value })}
                  placeholder="e.g. 293847192837461"
                  className="bg-white border-[#E5EBE7] font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <Label className="text-xs font-semibold text-[#718078]">System User Permanent Access Token</Label>
                  {config.hasAccessToken && (
                    <span className="text-[10px] text-[#16845B] font-bold">✓ Token stored securely</span>
                  )}
                </div>
                <Input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={config.hasAccessToken ? "•••••••••••••••• (Leave blank to keep current)" : "EAAG..."}
                  className="bg-white border-[#E5EBE7] font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#718078]">Approved Meta Utility Template Name</Label>
                <Input
                  value={config.templateName}
                  onChange={(e) => setConfig({ ...config, templateName: e.target.value })}
                  placeholder="order_invoice_utility"
                  className="bg-white border-[#E5EBE7] font-mono text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                type="submit"
                className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-7 py-2.5 text-xs font-bold transition shadow-xs"
              >
                Save WhatsApp Credentials
              </button>

              <div className="text-[11px] text-[#718078] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#16845B]" />
                <span>Tokens encrypted & verified server-side</span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Test Message & Webhook Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Send Test Message */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5EBE7]">
            <CardTitle className="text-sm font-bold text-[#172B25]">Send Test WhatsApp Message</CardTitle>
            <CardDescription className="text-xs text-[#718078]">
              Verify your WhatsApp Cloud API credentials before going live
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label className="text-xs font-semibold text-[#718078]">Test Mobile Number</Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1 bg-white border-[#E5EBE7] text-xs font-mono"
              />
            </div>
            <button
              type="button"
              onClick={handleSendTest}
              disabled={sendingTest}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
            >
              {sendingTest ? "Sending Test Ping..." : "Send Test Ping →"}
            </button>
          </CardContent>
        </Card>

        {/* Webhook Configuration Details */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5EBE7]">
            <CardTitle className="text-sm font-bold text-[#172B25]">Meta Webhook Configuration</CardTitle>
            <CardDescription className="text-xs text-[#718078]">
              Configure in Meta for Developers dashboard for real-time delivery tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5 text-xs text-[#172B25]">
            <div>
              <div className="font-semibold text-[#718078] text-[11px]">Callback URL:</div>
              <div className="font-mono bg-[#F8FAF9] p-2 rounded-lg border border-[#E5EBE7] select-all mt-0.5">
                https://www.restronexpos.com/api/webhooks/whatsapp
              </div>
            </div>
            <div>
              <div className="font-semibold text-[#718078] text-[11px]">Verify Token:</div>
              <div className="font-mono bg-[#F8FAF9] p-2 rounded-lg border border-[#E5EBE7] select-all mt-0.5">
                restronex_whatsapp_verify_token_2026
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Delivery Ledger */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5EBE7]">
          <CardTitle className="text-sm font-bold text-[#172B25]">Recent WhatsApp Message Delivery Logs</CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5EBE7] text-[#718078] font-semibold">
                  <th className="py-2.5">Time</th>
                  <th>Recipient Phone</th>
                  <th>Template</th>
                  <th>Delivery Status</th>
                  <th>Meta Message ID</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]/60">
                {logs.map((l: any) => (
                  <tr key={l.id} className="hover:bg-[#F8FAF9]">
                    <td className="py-2.5 font-mono text-[#718078]">
                      {new Date(l.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="font-bold text-[#172B25]">{l.recipientPhone}</td>
                    <td className="text-[#718078] font-mono">{l.templateName}</td>
                    <td>
                      <span
                        className={`rounded-full border px-2 py-0.5 font-bold text-[10px] ${
                          l.status === "DELIVERED" || l.status === "READ"
                            ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                            : l.status === "FAILED"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-blue-50 border-blue-200 text-blue-700"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="font-mono text-[#718078] text-[11px]">
                      {l.messageId?.slice(0, 16) || "Direct Cloud Link"}
                    </td>
                    <td>
                      {l.status === "FAILED" && l.orderId && (
                        <button
                          type="button"
                          onClick={() => handleRetryLog(l.orderId)}
                          className="text-[#16845B] hover:underline font-bold text-[11px]"
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#718078]">
                      No WhatsApp delivery attempts recorded yet. Place and settle a bill with customer phone.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
