"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import {
  Building2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
} from "lucide-react";

export default function SubscriptionsAdminClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"SUBSCRIPTIONS" | "PAYMENTS" | "WEBHOOKS">("SUBSCRIPTIONS");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [runningReminders, setRunningReminders] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);

  async function handleRunReminders() {
    setRunningReminders(true);
    setReminderStatus(null);
    try {
      const res = await fetch("/api/subscription/reminders", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        const sentCount = json.result?.remindersSent?.length ?? 0;
        const statusCount = json.result?.statusUpdates?.length ?? 0;
        setReminderStatus(`Completed: ${sentCount} reminders dispatched, ${statusCount} status updates applied.`);
        loadData();
      } else {
        setReminderStatus(`Failed: ${json.error || "Unable to dispatch reminders"}`);
      }
    } catch {
      setReminderStatus("Network error triggering reminders");
    } finally {
      setRunningReminders(false);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/subscriptions");
      if (res.ok) {
        const j = await res.json();
        setData(j);
      }
    } catch (err) {
      console.error("Failed to load platform subscription data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const metrics = data?.metrics || {
    totalSubscribedRestaurants: 0,
    activeSubscriptions: 0,
    trialingSubscriptions: 0,
    pendingSubscriptions: 0,
    cancelledSubscriptions: 0,
    mrrPaise: 0,
    planDistribution: {},
  };

  const filteredSubs = (data?.subscriptions || []).filter((s: any) => {
    const matchesSearch =
      !search ||
      s.tenant?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.tenant?.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.plan?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">SaaS Subscriptions & MRR</h1>
          <p className="text-sm text-[#718078]">
            Platform-wide tenant subscription entitlements, recurring revenue metrics, and webhook audit log.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {reminderStatus && (
            <span className="text-xs font-medium text-[#16845B] bg-[#E8F5EE] px-3 py-1.5 rounded-lg border border-[#16845B]/20">
              {reminderStatus}
            </span>
          )}
          <Button
            variant="outline"
            onClick={handleRunReminders}
            disabled={runningReminders}
            className="rounded-xl border-[#16845B]/30 bg-[#E8F5EE] text-[#16845B] hover:bg-[#16845B] hover:text-white text-xs font-semibold"
          >
            <Activity className={`h-3.5 w-3.5 mr-1.5 ${runningReminders ? "animate-spin" : ""}`} />
            Run Renewal Reminders
          </Button>
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl border-[#E5EBE7] bg-white text-xs font-semibold hover:bg-[#F8FAF9]"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Metrics
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase">Monthly MRR</div>
            <div className="text-xl font-black text-[#16845B] mt-1">{formatINR(metrics.mrrPaise)}</div>
            <div className="text-[10px] text-[#718078] mt-0.5">Recurring SaaS run-rate</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase flex items-center justify-between">
              <span>Active</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-[#16845B]" />
            </div>
            <div className="text-xl font-black text-[#172B25] mt-1">{metrics.activeSubscriptions}</div>
            <div className="text-[10px] text-[#16845B] font-semibold mt-0.5">Paid subscribers</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase flex items-center justify-between">
              <span>Past Due</span>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-black text-amber-600 mt-1">{metrics.pastDueSubscriptions || 0}</div>
            <div className="text-[10px] text-[#718078] mt-0.5">3-day grace period</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase flex items-center justify-between">
              <span>Restaurants</span>
              <Building2 className="h-3.5 w-3.5 text-[#718078]" />
            </div>
            <div className="text-xl font-black text-[#172B25] mt-1">{metrics.totalSubscribedRestaurants}</div>
            <div className="text-[10px] text-[#718078] mt-0.5">Registered tenants</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase flex items-center justify-between">
              <span>Reminders</span>
              <Activity className="h-3.5 w-3.5 text-[#16845B]" />
            </div>
            <div className="text-xl font-black text-[#172B25] mt-1">{metrics.totalNotificationsSent || 0}</div>
            <div className="text-[10px] text-[#16845B] mt-0.5">Sent notifications</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="p-4">
            <div className="text-[11px] font-bold text-[#718078] uppercase flex items-center justify-between">
              <span>Expired</span>
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div className="text-xl font-black text-red-600 mt-1">{(metrics.cancelledSubscriptions || 0) + (metrics.expiredSubscriptions || 0)}</div>
            <div className="text-[10px] text-[#718078] mt-0.5">Terminated / Expired</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5EBE7] gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("SUBSCRIPTIONS")}
          className={`pb-3 transition border-b-2 cursor-pointer ${
            activeTab === "SUBSCRIPTIONS"
              ? "border-[#16845B] text-[#16845B]"
              : "border-transparent text-[#718078] hover:text-[#172B25]"
          }`}
        >
          Tenant Subscriptions ({filteredSubs.length})
        </button>
        <button
          onClick={() => setActiveTab("PAYMENTS")}
          className={`pb-3 transition border-b-2 cursor-pointer ${
            activeTab === "PAYMENTS"
              ? "border-[#16845B] text-[#16845B]"
              : "border-transparent text-[#718078] hover:text-[#172B25]"
          }`}
        >
          Subscription Payments Ledger ({data?.subscriptionPayments?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("WEBHOOKS")}
          className={`pb-3 transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === "WEBHOOKS"
              ? "border-[#16845B] text-[#16845B]"
              : "border-transparent text-[#718078] hover:text-[#172B25]"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Razorpay Webhook Audit Logs ({data?.webhookEvents?.length || 0})
        </button>
      </div>

      {/* Tab 1: Subscriptions Table */}
      {activeTab === "SUBSCRIPTIONS" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E5EBE7] shadow-2xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#718078]" />
              <Input
                placeholder="Search restaurant or plan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {["ALL", "ACTIVE", "TRIALING", "PENDING", "CANCELLED", "PAST_DUE"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-pointer ${
                    statusFilter === status
                      ? "bg-[#16845B] text-white border-[#16845B]"
                      : "bg-[#F8FAF9] border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <Card className="bg-white border-[#E5EBE7] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[#718078] font-bold">
                  <tr>
                    <th className="py-3 px-4">Restaurant</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Cycle</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Period End</th>
                    <th className="py-3 px-4">Outlets / Staff</th>
                    <th className="py-3 px-4">Grace Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EBE7]">
                  {filteredSubs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#718078]">
                        No subscriptions found.
                      </td>
                    </tr>
                  ) : (
                    filteredSubs.map((s: any) => (
                      <tr key={s.id} className="hover:bg-[#F8FAF9] transition">
                        <td className="py-3.5 px-4 font-bold text-[#172B25]">
                          <div>{s.tenant?.name || "Restaurant"}</div>
                          <div className="text-[10px] text-[#718078] font-normal">{s.tenant?.email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#172B25]">
                          {s.plan?.name || "—"}
                        </td>
                        <td className="py-3.5 px-4 uppercase text-[#718078] font-bold text-[10px]">
                          {s.billingCycle}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              s.status === "ACTIVE"
                                ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                                : s.status === "TRIALING"
                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                : s.status === "PENDING"
                                ? "bg-amber-50 border-amber-200 text-amber-700"
                                : "bg-red-50 border-red-200 text-red-600"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#718078]">
                          {new Date(s.currentPeriodEnd).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-[#718078]">
                          {s.tenant?.outlets?.length || 1} / {s.plan?.maxOutlets || 1} outlets
                        </td>
                        <td className="py-3.5 px-4">
                          {s.cancelAtPeriodEnd ? (
                            <span className="text-amber-700 text-[10px] font-bold">Cancels at period end</span>
                          ) : s.status === "ACTIVE" ? (
                            <span className="text-[#16845B] text-[10px] font-semibold">Active & in good standing</span>
                          ) : (
                            <span className="text-[#718078] text-[10px]">Standard grace</span>
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

      {/* Tab 2: Payments Ledger */}
      {activeTab === "PAYMENTS" && (
        <Card className="bg-white border-[#E5EBE7] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[#718078] font-bold">
                <tr>
                  <th className="py-3 px-4">Invoice / ID</th>
                  <th className="py-3 px-4">Restaurant</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Razorpay Order</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {(data?.subscriptionPayments || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#718078]">
                      No subscription payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.subscriptionPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-[#F8FAF9] transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#172B25]">
                        {p.invoiceNumber || p.id.slice(0, 10)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#172B25]">
                        {p.subscription?.tenant?.name || "Restaurant"}
                      </td>
                      <td className="py-3.5 px-4 text-[#718078]">
                        {p.subscription?.plan?.name || "Plan"}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#16845B]">
                        {formatINR(p.amountPaise)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#718078]">
                        {p.razorpayOrderId || p.providerPaymentId || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === "COMPLETED"
                              ? "bg-[#E8F5EE] text-[#16845B]"
                              : p.status === "PENDING"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#718078]">
                        {new Date(p.createdAt).toLocaleDateString("en-IN", {
                          dateStyle: "short",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Webhook Audit Logs */}
      {activeTab === "WEBHOOKS" && (
        <Card className="bg-white border-[#E5EBE7] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[#718078] font-bold">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4">Processed Date</th>
                  <th className="py-3 px-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7]">
                {(data?.webhookEvents || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#718078]">
                      No webhook events logged yet.
                    </td>
                  </tr>
                ) : (
                  data.webhookEvents.map((w: any) => (
                    <tr key={w.id} className="hover:bg-[#F8FAF9] transition">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#172B25] font-bold">
                        {w.eventId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#172B25]">
                        <span className="bg-[#F8FAF9] border border-[#E5EBE7] px-2 py-0.5 rounded font-mono text-[10px]">
                          {w.eventType || w.provider}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            w.status === "PROCESSED" || w.processed
                              ? "bg-[#E8F5EE] text-[#16845B]"
                              : w.status === "PENDING"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {w.status || (w.processed ? "PROCESSED" : "PENDING")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#718078] font-mono">{w.attempts || 1}</td>
                      <td className="py-3.5 px-4 text-[#718078]">
                        {w.processedAt ? new Date(w.processedAt).toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-[#718078]">
                        {new Date(w.createdAt).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
