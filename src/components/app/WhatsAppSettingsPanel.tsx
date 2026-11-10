"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { MessageSquare, ShieldCheck, RefreshCw, ExternalLink, Unplug, Play } from "lucide-react";

export default function WhatsAppSettingsPanel({ selectedOutletId }: { selectedOutletId?: string }) {
  const [outlets, setOutlets] = useState<any[]>([]);
  const [activeOutletId, setActiveOutletId] = useState<string>(selectedOutletId || "");
  const [config, setConfig] = useState<any>({
    enabled: false,
    phoneNumberId: "",
    hasAccessToken: false,
    maskedToken: "Not configured",
    wabaId: "",
    displayPhone: "",
    templateName: "order_invoice_utility",
    connectionMode: "META_CLOUD_API",
    status: "NOT_CONFIGURED",
    source: "NONE",
  });
  const [tokenInput, setTokenInput] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (selectedOutletId !== undefined) setActiveOutletId(selectedOutletId);
  }, [selectedOutletId]);

  async function loadData(targetOutlet = activeOutletId) {
    setLoading(true);
    try {
      const qs = targetOutlet ? `?outletId=${encodeURIComponent(targetOutlet)}` : "";
      const [c, oList, orders] = await Promise.all([
        apiFetch(`/api/whatsapp/config${qs}`).then((r) => r.json()).catch(() => ({})),
        apiFetch("/api/outlets").then((r) => r.json()).catch(() => []),
        apiFetch("/api/orders?limit=30").then((r) => r.json()).catch(() => []),
      ]);
      if (Array.isArray(oList)) setOutlets(oList);

      // Show specific outlet override if viewing outlet scope, otherwise tenant-level default
      if (targetOutlet && Array.isArray(c?.outletConfigs)) {
        const match = c.outletConfigs.find((oc: any) => oc.outletId === targetOutlet);
        if (match) {
          setConfig({ ...match, source: "OUTLET", connectionMode: c.connectionMode || "META_CLOUD_API" });
        } else {
          setConfig({
            ...(c.tenantConfig || {}),
            enabled: c.tenantConfig?.enabled ?? false,
            source: "INHERIT_TENANT",
            connectionMode: c.connectionMode || "META_CLOUD_API",
          });
        }
      } else {
        setConfig(c || {});
      }

      if (Array.isArray(orders)) {
        const extracted = orders.flatMap((ord: any) =>
          (ord.whatsAppLogs || []).map((l: any) => ({ ...l, orderNumber: ord.orderNumber }))
        );
        setLogs(extracted);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(activeOutletId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOutletId]);

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await apiFetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE",
          outletId: activeOutletId || undefined,
          enabled: Boolean(config.enabled),
          phoneNumberId: config.phoneNumberId,
          accessToken: tokenInput || undefined,
          wabaId: config.wabaId,
          displayPhone: config.displayPhone,
          templateName: config.templateName,
          connectionMode: config.connectionMode || "META_CLOUD_API",
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: j.error || "Failed to save WhatsApp configuration" });
      } else {
        setMsg({ type: "success", text: j.message || "WhatsApp Cloud API credentials saved securely!" });
        setTokenInput("");
        loadData(activeOutletId);
      }
    } catch {
      setMsg({ type: "error", text: "Network error saving configuration" });
    } finally {
      setSaving(false);
    }
  }

  async function disconnectAccount() {
    if (!confirm("Disconnect WhatsApp Business configuration for this scope?")) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await apiFetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DISCONNECT",
          outletId: activeOutletId || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Disconnect failed");
      setMsg({ type: "success", text: "WhatsApp Business disconnected." });
      setTokenInput("");
      loadData(activeOutletId);
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "Disconnect failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest() {
    if (!testPhone || testPhone.trim().length < 10) {
      return setMsg({ type: "error", text: "Enter a valid 10+ digit test mobile number." });
    }
    setSendingTest(true);
    setMsg(null);
    try {
      const res = await apiFetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isTest: true,
          testPhone,
          outletId: activeOutletId || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: j.error || "Failed to send test message." });
      } else {
        setMsg({ type: "success", text: "✓ Test message dispatched via Meta WhatsApp Cloud API!" });
        loadData(activeOutletId);
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
        setMsg({ type: "success", text: `Retry executed — current status: ${j.result?.status || "QUEUED"}` });
        loadData(activeOutletId);
      } else {
        setMsg({ type: "error", text: j.error || "Retry failed." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error retrying delivery." });
    }
  }

  async function runRetryQueue() {
    setProcessingQueue(true);
    try {
      const res = await apiFetch("/api/jobs/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const j = await res.json();
      setMsg({
        type: "success",
        text: `Queue processed: ${j.whatsappProcessed || 0} WhatsApp & ${j.printProcessed || 0} Print jobs checked.`,
      });
      loadData(activeOutletId);
    } finally {
      setProcessingQueue(false);
    }
  }

  const statusBadge =
    config.status === "CONNECTED"
      ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
      : config.status === "DISCONNECTED"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-amber-50 border-amber-200 text-amber-800";

  return (
    <div className="space-y-5 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${statusBadge}`}>
            Status: {config.status || "NOT_CONFIGURED"}
          </span>
          {outlets.length > 0 && selectedOutletId === undefined && (
            <select
              value={activeOutletId}
              onChange={(e) => setActiveOutletId(e.target.value)}
              className="rounded-full border border-[#E5EBE7] bg-white px-3.5 py-1.5 text-xs font-bold text-[#172B25]"
            >
              <option value="">Organization Default (All Outlets)</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  Outlet Override: {o.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runRetryQueue}
            disabled={processingQueue}
            className="rounded-full border border-[#E5EBE7] bg-white px-4 py-1.5 text-xs font-bold text-[#16845B] hover:bg-[#F8FAF9] cursor-pointer"
          >
            {processingQueue ? "Processing..." : "Run Retry Worker"}
          </button>
          <button
            type="button"
            onClick={() => loadData(activeOutletId)}
            className="p-2 rounded-full border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
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

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5EBE7]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#E8F5EE] text-[#16845B]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold text-[#172B25]">
                  Official Meta WhatsApp Business Cloud API
                </CardTitle>
                <CardDescription className="text-xs text-[#718078]">
                  {activeOutletId
                    ? "Outlet-specific sender number override (falls back to tenant account if unset)"
                    : "Primary restaurant WhatsApp Business account • Tokens AES-256-GCM encrypted server-side"}
                </CardDescription>
              </div>
            </div>
            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-[#16845B] hover:underline inline-flex items-center gap-1"
            >
              Meta Cloud API Docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <form onSubmit={saveConfig} className="space-y-4">
            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(config.enabled)}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="h-4 w-4 rounded text-[#16845B] focus:ring-[#16845B]"
              />
              <div>
                <div className="text-xs font-bold text-[#172B25]">
                  Automatically deliver PDF tax invoice to customer WhatsApp on bill close
                </div>
                <div className="text-[11px] text-[#718078]">
                  Uses Utility templates with PDF header attachment • Respects CustomerConsent opt-outs
                </div>
              </div>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-[#718078]">Verified Sender Number</Label>
                <Input
                  value={config.displayPhone || ""}
                  onChange={(e) => setConfig({ ...config, displayPhone: e.target.value })}
                  placeholder="+91 95130 08467"
                  className="bg-white border-[#E5EBE7] font-mono text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#718078]">Phone Number ID</Label>
                <Input
                  value={config.phoneNumberId || ""}
                  onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                  placeholder="e.g. 104857291827461"
                  className="bg-white border-[#E5EBE7] font-mono text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#718078]">WABA ID</Label>
                <Input
                  value={config.wabaId || ""}
                  onChange={(e) => setConfig({ ...config, wabaId: e.target.value })}
                  placeholder="e.g. 293847192837461"
                  className="bg-white border-[#E5EBE7] font-mono text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-xs font-semibold text-[#718078]">Permanent System User Token</Label>
                  {config.hasAccessToken && (
                    <span className="text-[10px] text-[#16845B] font-bold">✓ Encrypted ({config.maskedToken})</span>
                  )}
                </div>
                <Input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={config.hasAccessToken ? "Leave blank to keep stored encrypted token" : "EAAG..."}
                  className="bg-white border-[#E5EBE7] font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-[#718078] mb-1 block">Approved Meta Utility Template</Label>
                <Input
                  value={config.templateName || "order_invoice_utility"}
                  onChange={(e) => setConfig({ ...config, templateName: e.target.value })}
                  placeholder="order_invoice_utility"
                  className="bg-white border-[#E5EBE7] font-mono text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap justify-between items-center gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-7 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {saving ? "Saving..." : "Connect / Save WhatsApp Config"}
                </button>
                {config.status === "CONNECTED" && (
                  <button
                    type="button"
                    onClick={disconnectAccount}
                    disabled={saving}
                    className="rounded-full border border-red-200 bg-white text-red-700 hover:bg-red-50 px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Unplug className="h-3.5 w-3.5" /> Disconnect
                  </button>
                )}
              </div>

              <div className="text-[11px] text-[#718078] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#16845B]" />
                <span>Never exposed in frontend bundle • AES-256-GCM encrypted</span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5EBE7]">
            <CardTitle className="text-sm font-bold text-[#172B25]">Send Test WhatsApp Message</CardTitle>
            <CardDescription className="text-xs text-[#718078]">
              Test with your verified developer/test number before enabling for guests
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+91 9XXXXXXXXX"
              className="bg-white border-[#E5EBE7] text-xs font-mono"
            />
            <button
              type="button"
              onClick={handleSendTest}
              disabled={sendingTest}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white py-2 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              {sendingTest ? "Dispatching..." : "Send Test Ping →"}
            </button>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5EBE7]">
            <CardTitle className="text-sm font-bold text-[#172B25]">Meta Webhook Callback Details</CardTitle>
            <CardDescription className="text-xs text-[#718078]">
              Tracks SENT → DELIVERED → READ receipts &amp; STOP opt-out replies
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5 text-xs">
            <div>
              <div className="font-semibold text-[#718078] text-[11px]">Callback URL</div>
              <div className="font-mono bg-[#F8FAF9] p-2 rounded-lg border border-[#E5EBE7] select-all mt-0.5 text-[11px]">
                https://www.restronexpos.com/api/webhooks/whatsapp
              </div>
            </div>
            <div>
              <div className="font-semibold text-[#718078] text-[11px]">Verify Token</div>
              <div className="font-mono bg-[#F8FAF9] p-2 rounded-lg border border-[#E5EBE7] select-all mt-0.5 text-[11px]">
                restronex_whatsapp_verify_token_2026
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5EBE7]">
          <CardTitle className="text-sm font-bold text-[#172B25]">WhatsApp Delivery History &amp; Failed Retries</CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5EBE7] text-[#718078] font-semibold">
                  <th className="py-2.5">Time</th>
                  <th>Order</th>
                  <th>Recipient</th>
                  <th>Template</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]/60">
                {logs.map((l: any) => (
                  <tr key={l.id} className="hover:bg-[#F8FAF9]">
                    <td className="py-2.5 font-mono text-[#718078]">
                      {new Date(l.createdAt).toLocaleTimeString("en-IN")}
                    </td>
                    <td className="font-mono text-[#172B25]">{l.orderNumber || "TEST"}</td>
                    <td className="font-bold text-[#172B25]">{l.recipientPhone}</td>
                    <td className="text-[#718078] font-mono">{l.templateName}</td>
                    <td>
                      <span
                        className={`rounded-full border px-2 py-0.5 font-bold text-[10px] ${
                          l.status === "DELIVERED" || l.status === "READ" || l.status === "SENT"
                            ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                            : l.status === "FAILED" || l.status === "OPTED_OUT"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-amber-50 border-amber-200 text-amber-800"
                        }`}
                      >
                        {l.status}
                      </span>
                      {l.errorMessage && (
                        <div className="text-[10px] text-red-600 mt-0.5 max-w-[200px] truncate">{l.errorMessage}</div>
                      )}
                    </td>
                    <td>
                      {l.status === "FAILED" && l.orderId && (
                        <button
                          type="button"
                          onClick={() => handleRetryLog(l.orderId)}
                          className="text-[#16845B] hover:underline font-bold text-[11px] cursor-pointer"
                        >
                          Retry →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#718078]">
                      No WhatsApp delivery logs recorded yet.
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
