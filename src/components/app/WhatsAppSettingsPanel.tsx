"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Play, RefreshCw } from "lucide-react";
import MetaWhatsAppConnectCard, { WhatsAppConfigResponse } from "./MetaWhatsAppConnectCard";

export default function WhatsAppSettingsPanel({ selectedOutletId }: { selectedOutletId?: string }) {
  const [outlets, setOutlets] = useState<any[]>([]);
  const [activeOutletId, setActiveOutletId] = useState<string>(selectedOutletId || "");
  const [configSnapshot, setConfigSnapshot] = useState<WhatsAppConfigResponse | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedOutletId !== undefined) setActiveOutletId(selectedOutletId);
  }, [selectedOutletId]);

  useEffect(() => {
    apiFetch("/api/outlets")
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) setOutlets(list);
      })
      .catch(() => {});
  }, []);

  async function refreshPanel() {
    setLoading(true);
    try {
      const qs = activeOutletId ? `?outletId=${encodeURIComponent(activeOutletId)}` : "";
      const res = await apiFetch(`/api/whatsapp/config${qs}`);
      const json = await res.json();
      if (res.ok) setConfigSnapshot(json);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendTest() {
    if (!testPhone || testPhone.trim().length < 10) {
      return setMsg({ type: "error", text: "Enter a valid mobile number with country code (e.g. +91 9XXXXXXXXX)." });
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
        setMsg({ type: "error", text: j.error || "Failed to send test WhatsApp message." });
      } else {
        setMsg({ type: "success", text: "✓ Test message dispatched via Meta WhatsApp Cloud API!" });
        await refreshPanel();
      }
    } catch {
      setMsg({ type: "error", text: "Network error sending test message." });
    } finally {
      setSendingTest(false);
    }
  }

  async function handleRetryLog(orderId: string) {
    if (!orderId) return;
    setMsg(null);
    try {
      const res = await apiFetch("/api/whatsapp/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const j = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: `Retry dispatched — status: ${j.result?.status || "QUEUED"}` });
        await refreshPanel();
      } else {
        setMsg({ type: "error", text: j.error || "Retry failed." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error retrying delivery." });
    }
  }

  async function runRetryQueue() {
    setProcessingQueue(true);
    setMsg(null);
    try {
      const res = await apiFetch("/api/jobs/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await res.json();
      setMsg({
        type: "success",
        text: `Queue processed: ${j.whatsappProcessed || 0} WhatsApp & ${j.printProcessed || 0} Print jobs checked.`,
      });
      await refreshPanel();
    } finally {
      setProcessingQueue(false);
    }
  }

  const logs = configSnapshot?.recentLogs || [];
  const lastSuccess = configSnapshot?.lastSuccessfulDelivery;
  const isConnected = configSnapshot?.status === "CONNECTED";

  return (
    <div className="space-y-5 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {outlets.length > 0 && selectedOutletId === undefined && (
            <select
              value={activeOutletId}
              onChange={(e) => setActiveOutletId(e.target.value)}
              className="rounded-full border border-[#E5EBE7] bg-white px-4 py-1.5 text-xs font-bold text-[#172B25]"
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
            onClick={refreshPanel}
            className="p-2 rounded-full border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] cursor-pointer"
            title="Refresh delivery logs"
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
          <button type="button" onClick={() => setMsg(null)} className="px-1">
            ×
          </button>
        </div>
      )}

      {/* Primary Zero-Credential Meta Embedded Signup Connection & Delivery Settings Card */}
      <MetaWhatsAppConnectCard
        outletId={activeOutletId || undefined}
        onStatusLoaded={(loaded) => setConfigSnapshot(loaded)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5EBE7]">
            <CardTitle className="text-sm font-bold text-[#172B25]">Send Test WhatsApp Message</CardTitle>
            <CardDescription className="text-xs text-[#718078]">
              {isConnected
                ? "Verify live delivery from your connected WhatsApp Business number"
                : "Connect your WhatsApp Business account above to enable live test messages"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+91 98765 43210"
              disabled={!isConnected}
              className="bg-white border-[#E5EBE7] text-xs font-mono"
            />
            <button
              type="button"
              onClick={handleSendTest}
              disabled={sendingTest || !isConnected}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] disabled:opacity-50 text-white py-2 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              {sendingTest ? "Sending..." : "Send Test Message →"}
            </button>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5EBE7]">
            <CardTitle className="text-sm font-bold text-[#172B25]">Delivery Health Summary</CardTitle>
            <CardDescription className="text-xs text-[#718078]">
              Automatic webhook tracking for Sent, Delivered, Read &amp; Opt-out events
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7]">
              <span className="text-[#718078] font-medium">Last Successful Delivery</span>
              <span className="font-bold text-[#172B25] flex items-center gap-1.5">
                {lastSuccess ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#16845B]" />
                    {new Date(lastSuccess.at).toLocaleString("en-IN")}
                  </>
                ) : (
                  "No deliveries yet"
                )}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7]">
              <span className="text-[#718078] font-medium">Failed Jobs Pending Retry</span>
              <span className="font-bold text-red-700">
                {logs.filter((l) => l.status === "FAILED").length}
              </span>
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
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]/60">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-[#F8FAF9]">
                    <td className="py-2.5 font-mono text-[#718078]">
                      {new Date(l.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="font-mono text-[#172B25]">{l.orderNumber || "TEST"}</td>
                    <td className="font-bold text-[#172B25]">{l.recipientPhone}</td>
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
                        <div className="text-[10px] text-red-600 mt-0.5 max-w-[260px] truncate">{l.errorMessage}</div>
                      )}
                    </td>
                    <td>
                      {l.status === "FAILED" && l.orderId && (
                        <button
                          type="button"
                          onClick={() => handleRetryLog(l.orderId!)}
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
                    <td colSpan={5} className="py-6 text-center text-[#718078]">
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
