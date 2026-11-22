"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, MessageSquare, Send, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { formatINR } from "@/lib/money";

export interface DeliveryLog {
  id: string;
  orderId: string;
  recipientPhone: string;
  channel: "WHATSAPP" | "SMS";
  provider: string;
  status: string;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  messageBody?: string | null;
  sentAt?: string | null;
  createdAt: string;
  order?: {
    orderNumber: string;
    totalPaise: number;
  };
}

export default function MessageDeliveryLogsPanel({ outletId }: { outletId?: string }) {
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadLogs();
  }, [outletId, channelFilter]);

  async function loadLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (outletId) params.set("outletId", outletId);
      if (channelFilter !== "ALL") params.set("channel", channelFilter);
      params.set("limit", "50");

      const res = await apiFetch(`/api/messages/logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (e: any) {
      console.warn("Error loading message logs:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry(log: DeliveryLog) {
    setRetryingId(log.id);
    setMsg(null);
    try {
      const res = await apiFetch("/api/messages/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: log.orderId, channel: log.channel }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: `${log.channel} invoice message resent successfully!` });
        await loadLogs();
      } else {
        setMsg({ type: "error", text: data.error || "Retry failed." });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Retry failed." });
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <Card className="rounded-3xl border border-[#E5EBE7] bg-white shadow-xs">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-black text-[#172B25]">
              Customer Message Delivery Logs
            </CardTitle>
            <CardDescription className="text-xs text-[#718078]">
              Real-time audit trail and delivery tracking for all customer WhatsApp and SMS receipts.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#F8FAF9] p-0.5 rounded-xl border border-[#E5EBE7] text-xs font-bold">
              {["ALL", "WHATSAPP", "SMS"].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannelFilter(ch)}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    channelFilter === ch
                      ? "bg-white text-[#172B25] shadow-xs"
                      : "text-[#718078] hover:text-[#172B25]"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadLogs}
              disabled={loading}
              className="p-2 rounded-xl border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] text-[#718078] hover:text-[#172B25] transition cursor-pointer disabled:opacity-50"
              title="Refresh Logs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {msg && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold border ${
              msg.type === "success"
                ? "bg-[#E8F5EE] border-[#B2DECA] text-[#16845B]"
                : "bg-red-50 border-red-200 text-red-600"
            }`}
          >
            {msg.text}
          </div>
        )}

        {logs.length === 0 ? (
          <div className="text-center py-12 text-[#718078] text-xs">
            {loading ? "Loading delivery logs..." : "No message delivery logs recorded yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E5EBE7] text-[11px] uppercase tracking-wider text-[#718078] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Order</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {logs.map((log) => {
                  const dateStr = new Date(log.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const isSuccess = log.status === "SENT" || log.status === "DELIVERED";
                  const isFailed = log.status === "FAILED";

                  return (
                    <tr key={log.id} className="hover:bg-[#F8FAF9]/60 transition">
                      <td className="py-3 px-3 text-[#718078] whitespace-nowrap font-mono text-[11px]">
                        {dateStr}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#172B25] whitespace-nowrap">
                        {log.order?.orderNumber || log.orderId.slice(-6)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.channel === "WHATSAPP"
                              ? "bg-[#E8F5EE] text-[#16845B]"
                              : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {log.channel === "WHATSAPP" ? (
                            <MessageSquare className="h-3 w-3" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          <span>{log.channel}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[#172B25] whitespace-nowrap">
                        {log.recipientPhone}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? "bg-[#E8F5EE] text-[#16845B]"
                              : isFailed
                              ? "bg-red-50 text-red-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : isFailed ? (
                            <AlertCircle className="h-3 w-3" />
                          ) : null}
                          <span>{log.status}</span>
                        </span>
                        {log.errorMessage && (
                          <div className="text-[10px] text-red-500 max-w-xs truncate mt-0.5">
                            {log.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {isFailed && (
                          <button
                            type="button"
                            onClick={() => handleRetry(log)}
                            disabled={retryingId === log.id}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16845B] hover:underline cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw className={`h-3 w-3 ${retryingId === log.id ? "animate-spin" : ""}`} />
                            <span>{retryingId === log.id ? "Retrying..." : "Retry"}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
