"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Search, RefreshCw, CheckCircle2, Clock, Building2 } from "lucide-react";

export default function NotificationsAdminClient({
  initialNotifications,
  totalCount,
}: {
  initialNotifications: any[];
  totalCount: number;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [isProcessing, setIsProcessing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = notifications.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.tenant.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesChannel = channelFilter === "ALL" || n.channel === channelFilter;
    return matchesSearch && matchesChannel;
  });

  async function triggerManualEvaluation() {
    setIsProcessing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/subscription/reminders", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Evaluation failed");

      setMsg(`✓ Checked ${j.result?.processedCount || 0} subscriptions. Dispatched ${j.result?.remindersSent?.length || 0} new reminders.`);
      // Refresh list
      const fetchRes = await fetch("/api/platform/notifications");
      if (fetchRes.ok) {
        const fresh = await fetchRes.json();
        setNotifications(fresh.notifications);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#172B25]">Platform Notifications &amp; Alert Center</h1>
          <p className="text-sm text-[#718078]">
            Automated lifecycle digests, renewal reminders (7d, 3d, 1d, 0d), and transactional alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {msg && (
            <span className="text-xs font-bold text-[#16845B] bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1.5 rounded-full">
              {msg}
            </span>
          )}
          <Button
            size="sm"
            onClick={triggerManualEvaluation}
            disabled={isProcessing}
            className="rounded-full bg-[#16845B] text-white px-4 py-1.5 text-xs font-bold hover:bg-[#116B49] shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isProcessing ? "animate-spin" : ""}`} />
            Run Lifecycle Check
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718078]" />
          <input
            type="text"
            placeholder="Search by restaurant name, title, or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] text-xs font-medium text-[#172B25] placeholder:text-[#718078] focus:outline-hidden focus:border-[#16845B] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-[#F8FAF9] border border-[#E5EBE7] px-3 py-1.5 rounded-xl">
            <span className="text-[#718078] font-semibold">Channel:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-transparent font-bold text-[#172B25] focus:outline-hidden"
            >
              <option value="ALL">All Channels</option>
              <option value="IN_APP">In-App Alerts</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>
          <div className="text-[#718078] font-semibold px-2">
            Showing {filtered.length} of {totalCount} total alerts
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5EBE7] bg-white p-8 text-center text-xs text-[#718078]">
            No notifications found matching your search.
          </div>
        ) : (
          filtered.map((n) => (
            <Card key={n.id} className="bg-white border-[#E5EBE7] shadow-xs">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#E8F5EE] p-1.5 text-[#16845B]">
                      <Bell className="h-3.5 w-3.5" />
                    </span>
                    <strong className="text-sm font-bold text-[#172B25]">{n.title}</strong>
                    <span className="rounded-full bg-[#F8FAF9] border border-[#E5EBE7] px-2 py-0.5 text-[10px] font-bold text-[#718078]">
                      {n.channel}
                    </span>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                      {n.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#718078] pl-7">{n.message}</p>
                </div>

                <div className="text-right sm:self-center shrink-0 pl-7 sm:pl-0">
                  <div className="text-xs font-bold text-[#172B25] flex items-center gap-1 justify-end">
                    <Building2 className="h-3.5 w-3.5 text-[#16845B]" />
                    <span>{n.tenant.name}</span>
                  </div>
                  <div className="text-[11px] text-[#718078]">
                    {new Date(n.sentAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
