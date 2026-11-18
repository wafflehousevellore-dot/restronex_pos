"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Store,
  Layers,
  ShoppingBag,
  BarChart3,
  FlaskConical,
  Settings,
  ArrowRight,
  ShieldCheck,
  Check,
  Zap,
  Clock,
  Printer,
  Bell,
  Utensils,
  Download,
  AlertTriangle,
  Play,
  KeyRound,
  FileSpreadsheet,
  HelpCircle,
  Power,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type TabKey = "overview" | "swiggy" | "zomato" | "outlets" | "menu" | "orders" | "reconciliation" | "simulator";

export default function OnlineIntegrationsClient() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Status & Data States
  const [statusData, setStatusData] = useState<any>(null);
  const [outletMappings, setOutletMappings] = useState<any[]>([]);
  const [menuPreview, setMenuPreview] = useState<any>(null);
  const [menuProvider, setMenuProvider] = useState<"SWIGGY" | "ZOMATO">("SWIGGY");
  const [menuStrategy, setMenuStrategy] = useState<string>("PERCENTAGE_HIKE");
  const [menuHikeValue, setMenuHikeValue] = useState<number>(15);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [reconciliation, setReconciliation] = useState<any>(null);

  // Connection Form States
  const [swiggyCreds, setSwiggyCreds] = useState({
    apiKey: "",
    merchantId: "",
    webhookSecret: "",
    environment: "sandbox",
  });
  const [zomatoCreds, setZomatoCreds] = useState({
    apiKey: "",
    merchantId: "",
    webhookSecret: "",
    environment: "sandbox",
  });

  // Simulator Form States
  const [simProvider, setSimProvider] = useState<"SWIGGY" | "ZOMATO">("SWIGGY");
  const [simOutletId, setSimOutletId] = useState("");
  const [simResult, setSimResult] = useState<any>(null);

  // Mapping Form States
  const [mapOutletId, setMapOutletId] = useState("");
  const [mapProvider, setMapProvider] = useState<"SWIGGY" | "ZOMATO">("SWIGGY");
  const [mapStoreId, setMapStoreId] = useState("");
  const [mapStoreName, setMapStoreName] = useState("");

  const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 6000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/aggregator?action=status");
      const json = await res.json();
      if (res.ok) {
        setStatusData(json);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchOutletMappings = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/aggregator?action=outlet_mappings");
      const json = await res.json();
      if (res.ok && json.mappings) {
        setOutletMappings(json.mappings);
        if (json.mappings.length > 0 && !simOutletId) {
          setSimOutletId(json.mappings[0].outletId);
          setMapOutletId(json.mappings[0].outletId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [simOutletId]);

  const fetchMenuPreview = useCallback(async (provider: "SWIGGY" | "ZOMATO", strategy?: string, hike?: number) => {
    try {
      const p = strategy ? `&strategy=${strategy}&hikeValue=${hike ?? 15}` : "";
      const res = await fetch(`/api/integrations/aggregator?action=preview_menu&provider=${provider}${p}`);
      const json = await res.json();
      if (res.ok) {
        setMenuPreview(json);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchExceptions = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/aggregator?action=exception_queue");
      const json = await res.json();
      if (res.ok && json.exceptions) {
        setExceptions(json.exceptions);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchReconciliation = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/aggregator?action=reconciliation");
      const json = await res.json();
      if (res.ok) {
        setReconciliation(json);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchStatus(),
      fetchOutletMappings(),
      fetchMenuPreview("SWIGGY", "PERCENTAGE_HIKE", 15),
      fetchExceptions(),
      fetchReconciliation(),
    ]).finally(() => setLoading(false));
  }, [fetchStatus, fetchOutletMappings, fetchMenuPreview, fetchExceptions, fetchReconciliation]);

  // Actions
  const handleSaveConnection = async (provider: "SWIGGY" | "ZOMATO") => {
    setActionLoading(true);
    try {
      const creds = provider === "SWIGGY" ? swiggyCreds : zomatoCreds;
      const res = await fetch("/api/integrations/aggregator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_connection",
          provider,
          credentials: creds,
          testMode: creds.environment === "sandbox",
          autoAccept: true,
          defaultPrepMinutes: 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save connection");
      showMsg(`${provider} integration credentials saved successfully`, "success");
      await fetchStatus();
    } catch (err: any) {
      showMsg(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async (provider: "SWIGGY" | "ZOMATO") => {
    if (!confirm(`Are you sure you want to disconnect ${provider}? All mapped stores will be toggled offline.`)) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/integrations/aggregator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disconnect");
      showMsg(`${provider} disconnected cleanly`, "info");
      await fetchStatus();
      await fetchOutletMappings();
    } catch (err: any) {
      showMsg(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMapOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapOutletId || !mapStoreId) {
      showMsg("Please select an outlet and enter Store ID", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/integrations/aggregator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "map_outlet",
          outletId: mapOutletId,
          provider: mapProvider,
          providerStoreId: mapStoreId,
          providerStoreName: mapStoreName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to map outlet");
      showMsg(`Mapped ${mapProvider} store ${mapStoreId} successfully`, "success");
      setMapStoreId("");
      setMapStoreName("");
      await fetchOutletMappings();
      await fetchStatus();
    } catch (err: any) {
      showMsg(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStoreStatus = async (outletId: string, provider: "SWIGGY" | "ZOMATO", currentOnline: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/integrations/aggregator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_store_status",
          outletId,
          provider,
          isOnline: !currentOnline,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update store status");
      showMsg(`Outlet status updated to ${!currentOnline ? "ONLINE" : "OFFLINE"} on ${provider}`, "success");
      await fetchOutletMappings();
    } catch (err: any) {
      showMsg(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRushMode = async (outletId: string, provider: "SWIGGY" | "ZOMATO", currentRush: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/integrations/aggregator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_rush_mode",
          outletId,
          provider,
          isRushMode: !currentRush,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle rush mode");
      showMsg(`Rush Mode ${!currentRush ? "ACTIVATED (+15m prep)" : "DEACTIVATED"} for ${provider}`, "success");
      await fetchOutletMappings();
    } catch (err: any) {
      showMsg(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePushMenuSync = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/integrations/aggregator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "push_menu_sync",
          provider: menuProvider,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to push menu");
      showMsg(`Master Menu synced to ${menuProvider} successfully across all mapped outlets!`, "success");
      await fetchStatus();
      await fetchMenuPreview(menuProvider, menuStrategy, menuHikeValue);
    } catch (err: any) {
      showMsg(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleItemAvailability = async (providerItemId: string, currentAvailable: boolean) => {
    try {
      const res = await fetch("/api/integrations/aggregator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_item_availability",
          providerItemId,
          isAvailable: !currentAvailable,
          provider: menuProvider,
        }),
      });
      if (res.ok) {
        showMsg(`Item availability toggled to ${!currentAvailable ? "IN STOCK" : "SOLD OUT"}`, "info");
        await fetchMenuPreview(menuProvider, menuStrategy, menuHikeValue);
      }
    } catch (err: any) {
      showMsg(err.message, "error");
    }
  };

  const handleSimulateOrder = async () => {
    setActionLoading(true);
    setSimResult(null);
    try {
      const res = await fetch("/api/integrations/aggregator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simulate_order",
          provider: simProvider,
          outletId: simOutletId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Simulation failed");
      setSimResult(data.result);
      showMsg(`Simulated ${simProvider} order ${data.result.orderNumber} successfully! KOT and Print Job dispatched.`, "success");
      await fetchStatus();
      await fetchReconciliation();
    } catch (err: any) {
      showMsg(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadCsv = () => {
    window.open("/api/integrations/aggregator?action=export_reconciliation", "_blank");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#172B25]">Online Integrations</h1>
              <p className="text-sm text-gray-500">
                Enterprise Petpooja-inspired Swiggy & Zomato integration, multi-outlet sync, and automated KOT routing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/integrations"
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            ← Legacy Integrations
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchStatus();
              fetchOutletMappings();
              fetchReconciliation();
              setLoading(false);
            }}
            disabled={loading || actionLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alert banner */}
      {msg && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in ${
            msg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : msg.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {msg.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />}
          {msg.type === "error" && <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />}
          {msg.type === "info" && <HelpCircle className="w-5 h-5 shrink-0 text-blue-600" />}
          <div className="flex-1 font-medium">{msg.text}</div>
          <button onClick={() => setMsg(null)} className="text-xs font-semibold opacity-60 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b text-sm font-medium">
        {[
          { key: "overview", label: "Overview", icon: Layers },
          { key: "swiggy", label: "Swiggy", icon: Zap, badge: statusData?.swiggy?.status === "CONNECTED" ? "Active" : undefined },
          { key: "zomato", label: "Zomato", icon: ShoppingBag, badge: statusData?.zomato?.status === "CONNECTED" ? "Active" : undefined },
          { key: "outlets", label: "Outlet Mapping", icon: Store, count: statusData?.stats?.mappedOutletsCount },
          { key: "menu", label: "Menu Synchronisation", icon: Utensils },
          { key: "orders", label: "Live Orders & Exceptions", icon: Clock, count: statusData?.stats?.exceptionsCount > 0 ? `${statusData.stats.exceptionsCount} Alerts` : undefined },
          { key: "reconciliation", label: "Reconciliation", icon: BarChart3 },
          { key: "simulator", label: "Test Simulator", icon: FlaskConical },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap text-xs sm:text-sm ${
                isActive
                  ? "bg-[#16845B] text-white font-semibold shadow-xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold rounded-full bg-emerald-100 text-emerald-800">
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-gray-200 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase font-bold text-gray-500 tracking-wider">Swiggy Status</div>
                  <div className="text-xl font-bold mt-1 text-[#172B25] flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        statusData?.swiggy?.status === "CONNECTED" ? "bg-emerald-500" : "bg-amber-400"
                      }`}
                    />
                    {statusData?.swiggy?.status || "NOT_CONNECTED"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Mode: {statusData?.swiggy?.testMode ? "Test / Sandbox" : "Live Production"}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-extrabold text-lg">
                  S
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase font-bold text-gray-500 tracking-wider">Zomato Status</div>
                  <div className="text-xl font-bold mt-1 text-[#172B25] flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        statusData?.zomato?.status === "CONNECTED" ? "bg-emerald-500" : "bg-amber-400"
                      }`}
                    />
                    {statusData?.zomato?.status || "NOT_CONNECTED"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Mode: {statusData?.zomato?.testMode ? "Test / Sandbox" : "Live Production"}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-extrabold text-lg">
                  Z
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase font-bold text-gray-500 tracking-wider">Mapped Outlets</div>
                  <div className="text-2xl font-bold mt-1 text-[#172B25]">
                    {statusData?.stats?.mappedOutletsCount || 0} / {statusData?.stats?.outletsCount || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">1-to-1 Provider Store ID Links</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Store className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase font-bold text-gray-500 tracking-wider">Active Pipeline</div>
                  <div className="text-2xl font-bold mt-1 text-[#172B25]">
                    {statusData?.stats?.activeOrdersCount || 0} Orders
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">In Kitchen KOT / Dispatch</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Zap className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Architecture & Workflow Diagram */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[#172B25] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Petpooja-Inspired Enterprise Aggregator Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                  <div className="text-xs font-bold uppercase text-gray-600 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
                    Webhook Ingestion
                  </div>
                  <p className="text-xs text-gray-600">
                    HMAC-SHA256 signature verification, idempotency gate, and raw payload audit logging.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                  <div className="text-xs font-bold uppercase text-gray-600 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                    Multi-Outlet Routing
                  </div>
                  <p className="text-xs text-gray-600">
                    Matches Store ID to RestroNex outlet. Unmapped stores are queued safely in exception logs.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                  <div className="text-xs font-bold uppercase text-gray-600 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                    Kitchen Station KOT
                  </div>
                  <p className="text-xs text-gray-600">
                    Auto-splits items by station (Food → Main Kitchen, Drinks → Bar) with audio chime alert.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                  <div className="text-xs font-bold uppercase text-gray-600 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">4</span>
                    Auto Thermal Print
                  </div>
                  <p className="text-xs text-gray-600">
                    Dispatches 80mm/58mm thermal print job to designated network or USB receipt printers.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
                  <Zap className="w-4 h-4 text-emerald-700" />
                  <span>Ready to test the pipeline? Trigger a mock delivery order in the Test Simulator.</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => setActiveTab("simulator")}
                  className="bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-semibold"
                >
                  Open Simulator →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: SWIGGY */}
      {activeTab === "swiggy" && (
        <div className="space-y-6">
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-black text-xl">
                    S
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-[#172B25]">Swiggy Partner Integration</CardTitle>
                    <p className="text-xs text-gray-500">Official Merchant API & Webhook Configuration</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    statusData?.swiggy?.status === "CONNECTED"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {statusData?.swiggy?.status || "NOT_CONNECTED"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Checklist */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Swiggy Onboarding Checklist
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Registered restaurant on Swiggy Partner Portal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>POS API integration enabled by Swiggy POC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Webhook URL registered for instant order push</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Outlets mapped to Swiggy Store IDs in RestroNex</span>
                  </div>
                </div>
              </div>

              {/* Webhook endpoint card */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                <div className="text-xs font-bold text-blue-900">Your Swiggy Webhook URL:</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white px-3 py-1.5 rounded-lg border border-blue-200 text-blue-900 font-mono flex-1 overflow-x-auto">
                    {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/swiggy` : "https://www.restronexpos.com/api/webhooks/swiggy"}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/swiggy`);
                      showMsg("Webhook URL copied to clipboard", "info");
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-[11px] text-blue-700">
                  Share this URL with your Swiggy Account Manager or configure it in Swiggy Partner Portal Settings.
                </p>
              </div>

              {/* Credentials form */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#172B25]">Credentials & Environment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Partner API Key / Client Token</Label>
                    <Input
                      type="password"
                      placeholder="swg_api_key_..."
                      value={swiggyCreds.apiKey}
                      onChange={(e) => setSwiggyCreds({ ...swiggyCreds, apiKey: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Merchant ID / Partner ID</Label>
                    <Input
                      placeholder="e.g. SWG-MERCHANT-8492"
                      value={swiggyCreds.merchantId}
                      onChange={(e) => setSwiggyCreds({ ...swiggyCreds, merchantId: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Webhook Signing Secret</Label>
                    <Input
                      type="password"
                      placeholder="Used for HMAC-SHA256 verification"
                      value={swiggyCreds.webhookSecret}
                      onChange={(e) => setSwiggyCreds({ ...swiggyCreds, webhookSecret: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Execution Mode</Label>
                    <select
                      value={swiggyCreds.environment}
                      onChange={(e) => setSwiggyCreds({ ...swiggyCreds, environment: e.target.value })}
                      className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white"
                    >
                      <option value="sandbox">Sandbox / Test Mode (Safe Mock Simulation)</option>
                      <option value="production">Live Production (Official Swiggy API)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <Button
                    onClick={() => handleSaveConnection("SWIGGY")}
                    disabled={actionLoading}
                    className="bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-semibold"
                  >
                    Save Swiggy Settings
                  </Button>
                  {statusData?.swiggy?.status === "CONNECTED" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDisconnect("SWIGGY")}
                      disabled={actionLoading}
                      className="text-xs font-semibold"
                    >
                      Disconnect Swiggy
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: ZOMATO */}
      {activeTab === "zomato" && (
        <div className="space-y-6">
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-black text-xl">
                    Z
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-[#172B25]">Zomato Partner Integration</CardTitle>
                    <p className="text-xs text-gray-500">Official Merchant API & Webhook Configuration</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    statusData?.zomato?.status === "CONNECTED"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {statusData?.zomato?.status || "NOT_CONNECTED"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Checklist */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                  Zomato Onboarding Checklist
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Active restaurant listing on Zomato for Business</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>POS integration access token provided by Zomato</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Order Relay webhook URL configured</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Outlets mapped to Zomato Res IDs in RestroNex</span>
                  </div>
                </div>
              </div>

              {/* Webhook endpoint card */}
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
                <div className="text-xs font-bold text-red-900">Your Zomato Webhook URL:</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white px-3 py-1.5 rounded-lg border border-red-200 text-red-900 font-mono flex-1 overflow-x-auto">
                    {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/zomato` : "https://www.restronexpos.com/api/webhooks/zomato"}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/zomato`);
                      showMsg("Webhook URL copied to clipboard", "info");
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-[11px] text-red-700">
                  Share this URL with your Zomato POS Account Manager or input it in Zomato Merchant Dashboard.
                </p>
              </div>

              {/* Credentials form */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#172B25]">Credentials & Environment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Partner API Key / Access Token</Label>
                    <Input
                      type="password"
                      placeholder="zom_api_token_..."
                      value={zomatoCreds.apiKey}
                      onChange={(e) => setZomatoCreds({ ...zomatoCreds, apiKey: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Restaurant ID (Res ID)</Label>
                    <Input
                      placeholder="e.g. 19284012"
                      value={zomatoCreds.merchantId}
                      onChange={(e) => setZomatoCreds({ ...zomatoCreds, merchantId: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Webhook Secret / Bearer Token</Label>
                    <Input
                      type="password"
                      placeholder="Secret token for incoming webhook verification"
                      value={zomatoCreds.webhookSecret}
                      onChange={(e) => setZomatoCreds({ ...zomatoCreds, webhookSecret: e.target.value })}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Execution Mode</Label>
                    <select
                      value={zomatoCreds.environment}
                      onChange={(e) => setZomatoCreds({ ...zomatoCreds, environment: e.target.value })}
                      className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white"
                    >
                      <option value="sandbox">Sandbox / Test Mode (Safe Mock Simulation)</option>
                      <option value="production">Live Production (Official Zomato API)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <Button
                    onClick={() => handleSaveConnection("ZOMATO")}
                    disabled={actionLoading}
                    className="bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-semibold"
                  >
                    Save Zomato Settings
                  </Button>
                  {statusData?.zomato?.status === "CONNECTED" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDisconnect("ZOMATO")}
                      disabled={actionLoading}
                      className="text-xs font-semibold"
                    >
                      Disconnect Zomato
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: OUTLETS */}
      {activeTab === "outlets" && (
        <div className="space-y-6">
          {/* Add Mapping Form */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold text-[#172B25] flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                Map Outlet to Swiggy or Zomato Store ID
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleMapOutlet} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs">RestroNex Outlet</Label>
                  <select
                    value={mapOutletId}
                    onChange={(e) => setMapOutletId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  >
                    {outletMappings.map((o) => (
                      <option key={o.outletId} value={o.outletId}>
                        {o.outletName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Aggregator Provider</Label>
                  <select
                    value={mapProvider}
                    onChange={(e) => setMapProvider(e.target.value as "SWIGGY" | "ZOMATO")}
                    className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  >
                    <option value="SWIGGY">Swiggy</option>
                    <option value="ZOMATO">Zomato</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">External Store ID</Label>
                  <Input
                    placeholder="e.g. SWG-10293 or 1928401"
                    value={mapStoreId}
                    onChange={(e) => setMapStoreId(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Store Name / Branch</Label>
                  <Input
                    placeholder="e.g. Sector 14 Branch"
                    value={mapStoreName}
                    onChange={(e) => setMapStoreName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-semibold"
                  >
                    Save Mapping
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Mapped Outlets Table */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold text-[#172B25]">Connected Outlets & Operational Controls</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b text-gray-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Outlet</th>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">External Store ID</th>
                      <th className="px-4 py-3">Store Status</th>
                      <th className="px-4 py-3">Rush Mode</th>
                      <th className="px-4 py-3">KOT / Printing</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {outletMappings.flatMap((outlet) =>
                      outlet.mappings.length > 0 ? (
                        outlet.mappings.map((m: any) => (
                          <tr key={m.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{outlet.outletName}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  m.provider === "SWIGGY" ? "bg-orange-100 text-orange-800" : "bg-red-100 text-red-800"
                                }`}
                              >
                                {m.provider}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-700">
                              {m.providerStoreId}
                              {m.providerStoreName && (
                                <span className="text-gray-400 block text-[10px]">{m.providerStoreName}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleToggleStoreStatus(outlet.outletId, m.provider, m.isOnline)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                                  m.isOnline
                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                              >
                                <span className={`w-2 h-2 rounded-full ${m.isOnline ? "bg-emerald-600" : "bg-gray-500"}`} />
                                {m.isOnline ? "ONLINE" : "OFFLINE"}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleToggleRushMode(outlet.outletId, m.provider, m.isRushMode)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                                  m.isRushMode
                                    ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                {m.isRushMode ? "⚡ Rush (+15m)" : "Normal"}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-gray-600 flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <Printer className="w-3.5 h-3.5 text-gray-500" /> KOT: ON
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[11px] text-red-600 hover:bg-red-50"
                                onClick={async () => {
                                  if (confirm("Remove mapping?")) {
                                    await fetch("/api/integrations/aggregator", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        action: "unmap_outlet",
                                        outletId: outlet.outletId,
                                        provider: m.provider,
                                      }),
                                    });
                                    fetchOutletMappings();
                                  }
                                }}
                              >
                                Unmap
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr key={outlet.outletId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{outlet.outletName}</td>
                          <td colSpan={5} className="px-4 py-3 text-gray-400 italic">
                            No aggregator mappings configured
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-[10px] text-gray-400">Use form above to map</span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: MENU */}
      {activeTab === "menu" && (
        <div className="space-y-6">
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-[#172B25] flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-600" />
                  Master Menu Synchronisation & Pricing Controls
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Configure channel price markup formulas and push master catalog to aggregators
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePushMenuSync}
                  disabled={actionLoading}
                  className="bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
                  Push Menu to {menuProvider}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* Controls bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Target Aggregator</Label>
                  <select
                    value={menuProvider}
                    onChange={(e) => {
                      const p = e.target.value as "SWIGGY" | "ZOMATO";
                      setMenuProvider(p);
                      fetchMenuPreview(p, menuStrategy, menuHikeValue);
                    }}
                    className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  >
                    <option value="SWIGGY">Swiggy</option>
                    <option value="ZOMATO">Zomato</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Pricing Strategy</Label>
                  <select
                    value={menuStrategy}
                    onChange={(e) => {
                      setMenuStrategy(e.target.value);
                      fetchMenuPreview(menuProvider, e.target.value, menuHikeValue);
                    }}
                    className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  >
                    <option value="MASTER_EQUAL">Equal to POS Dine-in Price (0% Hike)</option>
                    <option value="PERCENTAGE_HIKE">Percentage Markup (+15% or Custom)</option>
                    <option value="FIXED_HIKE">Fixed Markup (+₹20 or Custom)</option>
                    <option value="CUSTOM_MAPPING">Custom Item Mapping Overrides</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Markup Value (% or ₹)</Label>
                  <Input
                    type="number"
                    value={menuHikeValue}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMenuHikeValue(v);
                      fetchMenuPreview(menuProvider, menuStrategy, v);
                    }}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Items Preview Table */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b text-gray-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Item Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Master Price</th>
                      <th className="px-4 py-3">Aggregator Price</th>
                      <th className="px-4 py-3">Stock Switch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {menuPreview?.items && menuPreview.items.length > 0 ? (
                      menuPreview.items.map((item: any) => (
                        <tr key={item.providerItemId} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-900">{item.name}</td>
                          <td className="px-4 py-2.5 text-gray-600">{item.categoryName}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.foodType === "VEG" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}
                            >
                              {item.foodType}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 line-through">₹{item.masterPricePaise / 100}</td>
                          <td className="px-4 py-2.5 font-bold text-emerald-700">₹{item.pricePaise / 100}</td>
                          <td className="px-4 py-2.5">
                            <button
                              onClick={() => handleToggleItemAvailability(item.providerItemId, item.isAvailable)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                                item.isAvailable
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              {item.isAvailable ? "IN STOCK" : "SOLD OUT"}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                          No menu items found. Add items to Menu Catalog to sync.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: ORDERS & EXCEPTIONS */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          {/* Exception Alerts */}
          {exceptions.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-3 border-b border-amber-200">
                <CardTitle className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Integration Exception Queue ({exceptions.length} Issues)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {exceptions.map((ex: any) => (
                  <div key={ex.id} className="p-3 bg-white rounded-lg border border-amber-200 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-amber-900 flex items-center gap-2">
                        <span>{ex.errorType}</span>
                        <span className="text-gray-400">•</span>
                        <span>{ex.provider}</span>
                        {ex.externalOrderId && (
                          <span className="font-mono text-gray-600">({ex.externalOrderId})</span>
                        )}
                      </div>
                      <div className="text-gray-600 mt-0.5">{ex.reason}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-amber-900"
                      onClick={async () => {
                        await fetch("/api/integrations/aggregator", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "resolve_exception", exceptionId: ex.id }),
                        });
                        fetchExceptions();
                      }}
                    >
                      Resolve
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Live Orders View */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#172B25] flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Live Online Orders Pipeline
              </CardTitle>
              <span className="text-xs text-gray-500">Auto-routes to KOT Kitchen & KDS Screens</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-8 text-center text-gray-500 text-xs">
                To view real-time orders flowing from Swiggy & Zomato into POS and Kitchen stations, switch to{" "}
                <Link href="/app/orders" className="text-emerald-700 font-bold underline">
                  POS Orders View
                </Link>{" "}
                or the{" "}
                <Link href="/staff/kds" className="text-emerald-700 font-bold underline">
                  Live KDS Kitchen Screen
                </Link>
                .
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: RECONCILIATION */}
      {activeTab === "reconciliation" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-3 border">
              <div className="text-[11px] font-bold text-gray-500 uppercase">Total Orders</div>
              <div className="text-lg font-bold text-[#172B25] mt-1">{reconciliation?.summary?.totalOrders || 0}</div>
            </Card>
            <Card className="p-3 border">
              <div className="text-[11px] font-bold text-gray-500 uppercase">Gross Sales</div>
              <div className="text-lg font-bold text-emerald-700 mt-1">₹{reconciliation?.summary?.grossSales?.toFixed(2) || "0.00"}</div>
            </Card>
            <Card className="p-3 border">
              <div className="text-[11px] font-bold text-gray-500 uppercase">Discounts</div>
              <div className="text-lg font-bold text-amber-700 mt-1">₹{reconciliation?.summary?.totalDiscounts?.toFixed(2) || "0.00"}</div>
            </Card>
            <Card className="p-3 border">
              <div className="text-[11px] font-bold text-gray-500 uppercase">Taxes</div>
              <div className="text-lg font-bold text-gray-700 mt-1">₹{reconciliation?.summary?.totalTaxes?.toFixed(2) || "0.00"}</div>
            </Card>
            <Card className="p-3 border">
              <div className="text-[11px] font-bold text-gray-500 uppercase">Commission</div>
              <div className="text-lg font-bold text-red-700 mt-1">₹{reconciliation?.summary?.totalCommission?.toFixed(2) || "0.00"}</div>
            </Card>
            <Card className="p-3 border bg-emerald-50/50 border-emerald-200">
              <div className="text-[11px] font-bold text-emerald-800 uppercase">Net Payout</div>
              <div className="text-lg font-bold text-emerald-900 mt-1">₹{reconciliation?.summary?.netPayout?.toFixed(2) || "0.00"}</div>
            </Card>
          </div>

          {/* Orders Table */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-[#172B25]">Aggregator Settlement Ledger</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadCsv}
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV Report
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b text-gray-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Order Number</th>
                      <th className="px-4 py-3">Provider</th>
                      <th className="px-4 py-3">Outlet</th>
                      <th className="px-4 py-3">Gross</th>
                      <th className="px-4 py-3">Commission (18%)</th>
                      <th className="px-4 py-3">Net Payout</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reconciliation?.orders && reconciliation.orders.length > 0 ? (
                      reconciliation.orders.map((o: any) => (
                        <tr key={o.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-bold text-gray-900">{o.orderNumber}</td>
                          <td className="px-4 py-2.5 font-semibold">
                            <span className={o.provider === "SWIGGY" ? "text-orange-600" : "text-red-600"}>
                              {o.provider}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{o.outletName}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-900">₹{o.grossAmount.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-red-600">-₹{o.commission.toFixed(2)}</td>
                          <td className="px-4 py-2.5 font-bold text-emerald-700">₹{o.netPayout.toFixed(2)}</td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                              {o.orderStatus}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500">
                            {new Date(o.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                          No aggregator orders found for reconciliation yet. Run a test order in the simulator!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: SIMULATOR */}
      {activeTab === "simulator" && (
        <div className="space-y-6">
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold text-[#172B25] flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-emerald-600" />
                Aggregator Sandbox & Order Simulator
              </CardTitle>
              <p className="text-xs text-gray-500">
                Safely trigger incoming delivery orders to test KOT ticket routing, thermal receipt printing, and kitchen alerts
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Select Aggregator Platform</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSimProvider("SWIGGY")}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
                        simProvider === "SWIGGY"
                          ? "bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-500/20"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px]">S</span>
                      Swiggy Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimProvider("ZOMATO")}
                      className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
                        simProvider === "ZOMATO"
                          ? "bg-red-50 border-red-500 text-red-700 ring-2 ring-red-500/20"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">Z</span>
                      Zomato Delivery
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Target Outlet</Label>
                  <select
                    value={simOutletId}
                    onChange={(e) => setSimOutletId(e.target.value)}
                    className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  >
                    {outletMappings.map((o) => (
                      <option key={o.outletId} value={o.outletId}>
                        {o.outletName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-1.5">
                <div className="font-bold text-gray-800">What happens when you click "Trigger Test Order":</div>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Creates an idempotent POS Order with source <span className="font-semibold text-gray-800">{simProvider}</span>.</li>
                  <li>Generates a Kitchen Order Ticket (KOT) routed to MAIN kitchen and BAR station.</li>
                  <li>Queues an 80mm thermal print job in the receipt printer queue.</li>
                  <li>Broadcasts real-time KDS chime event across active kitchen display terminals.</li>
                </ul>
              </div>

              <Button
                onClick={handleSimulateOrder}
                disabled={actionLoading}
                className="w-full sm:w-auto bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-bold px-6 py-2.5 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Trigger Test {simProvider} Order Now
              </Button>

              {/* Simulation Result */}
              {simResult && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs text-emerald-900 animate-in fade-in">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Test Order Created Successfully!
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono">
                    <div>
                      <span className="text-gray-500 block text-[10px]">ORDER NUMBER</span>
                      <span className="font-bold">{simResult.orderNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">EXTERNAL REF</span>
                      <span className="font-bold">{simResult.displayOrderId}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">TICKET ID</span>
                      <span className="font-bold">{simResult.ticketId?.slice(-8)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">STATUS</span>
                      <span className="font-bold">{simResult.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
