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
  ShieldAlert,
  XCircle,
  ExternalLink,
  Mail,
  Copy,
  Lock,
  Server,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { statusLabel, IntegrationStatus } from "@/lib/integrations";

// ----------------------------------------------------------------------
// Status Badge Component (10-Status Model)
// ----------------------------------------------------------------------
function IntegrationStatusBadge({ status }: { status: string }) {
  const meta = statusLabel(status);
  return (
    <span
      className={`px-3 py-1 text-xs font-bold uppercase rounded-full border inline-flex items-center gap-1.5 shadow-2xs ${meta.badgeClass}`}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: meta.color }}
      />
      {meta.text}
    </span>
  );
}

// ----------------------------------------------------------------------
// Verification Stage Matrix Component
// ----------------------------------------------------------------------
function VerificationStageList({
  stages,
}: {
  stages?: Record<string, { label: string; isComplete: boolean; status: string; detail: string }>;
}) {
  if (!stages) return null;
  const stageKeys = [
    "merchantAccountActive",
    "providerApprovalPending",
    "apiCredentialsConfigured",
    "webhookRegistered",
    "webhookSignatureVerified",
    "integrationOperational",
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {stageKeys.map((key, idx) => {
        const item = stages[key];
        if (!item) return null;
        return (
          <div
            key={key}
            className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 ${
              item.isComplete
                ? "bg-emerald-50/60 border-emerald-200"
                : item.status === "APPROVAL_REQUIRED" || item.status === "SECRET_REQUIRED"
                ? "bg-amber-50/60 border-amber-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xs font-bold text-[#172B25]">{item.label}</span>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full shrink-0 ${
                  item.isComplete
                    ? "bg-emerald-100 text-emerald-800"
                    : item.status === "APPROVAL_REQUIRED" || item.status === "SECRET_REQUIRED"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {item.status}
              </span>
            </div>
            <p className="text-[11px] text-gray-600 leading-snug">{item.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

type TabKey = "overview" | "swiggy" | "zomato" | "outlets" | "menu" | "orders" | "reconciliation";

export default function OnlineIntegrationsClient() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
    partnerClientId: "",
    apiKey: "",
    merchantId: "",
    webhookSecret: "",
    environment: "production",
  });
  const [zomatoCreds, setZomatoCreds] = useState({
    posId: "",
    apiKey: "",
    merchantId: "",
    webhookSecret: "",
    environment: "production",
  });

  // Password visibility toggles
  const [showSwiggySecret, setShowSwiggySecret] = useState(false);
  const [showZomatoSecret, setShowZomatoSecret] = useState(false);

  // Mapping Form States
  const [mapOutletId, setMapOutletId] = useState("");
  const [mapProvider, setMapProvider] = useState<"SWIGGY" | "ZOMATO">("SWIGGY");
  const [mapStoreId, setMapStoreId] = useState("");
  const [mapStoreName, setMapStoreName] = useState("");

  const showMsg = (text: string, type: "success" | "error" | "info" = "info") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 7000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/aggregator?action=status");
      const json = await res.json();
      if (res.ok) {
        setStatusData(json);
        // Pre-fill masked hints if present
        if (json.swiggy?.merchantId && !swiggyCreds.merchantId) {
          setSwiggyCreds((prev) => ({
            ...prev,
            merchantId: json.swiggy.merchantId,
            partnerClientId: json.swiggy.partnerClientId || "",
          }));
        }
        if (json.zomato?.merchantId && !zomatoCreds.merchantId) {
          setZomatoCreds((prev) => ({
            ...prev,
            merchantId: json.zomato.merchantId,
            posId: json.zomato.posId || "",
          }));
        }
      }
    } catch (err) {
      console.error("fetchStatus error:", err);
    }
  }, [swiggyCreds.merchantId, zomatoCreds.merchantId]);

  const fetchOutletMappings = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/aggregator?action=outlet_mappings");
      const json = await res.json();
      if (res.ok && json.mappings) {
        setOutletMappings(json.mappings);
        if (json.mappings.length > 0 && !mapOutletId) {
          setMapOutletId(json.mappings[0].outletId);
        }
      }
    } catch (err) {
      console.error("fetchOutletMappings error:", err);
    }
  }, [mapOutletId]);

  const fetchMenuPreview = useCallback(async (provider: "SWIGGY" | "ZOMATO", strategy?: string, hike?: number) => {
    try {
      const p = strategy ? `&strategy=${strategy}&hikeValue=${hike ?? 15}` : "";
      const res = await fetch(`/api/integrations/aggregator?action=preview_menu&provider=${provider}${p}`);
      const json = await res.json();
      if (res.ok) {
        setMenuPreview(json);
      }
    } catch (err) {
      console.error("fetchMenuPreview error:", err);
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
      console.error("fetchExceptions error:", err);
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
      console.error("fetchReconciliation error:", err);
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
          testMode: false,
          autoAccept: true,
          defaultPrepMinutes: 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save connection");
      showMsg(`${provider} configuration saved in encrypted vault. Status updated.`, "success");
      await fetchStatus();
    } catch (err: any) {
      showMsg(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestVerification = async (provider: "SWIGGY" | "ZOMATO") => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/integrations/aggregator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_verification",
          provider,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`${provider} connection verified successfully!`, "success");
      } else {
        showMsg(`${data.status}: ${data.message}`, "info");
      }
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
      showMsg(`${provider} disconnected cleanly. Outlets set offline.`, "info");
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
      showMsg("Please select an outlet and enter Store/Restaurant ID", "error");
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
          providerStoreId: mapStoreId.trim(),
          providerStoreName: mapStoreName.trim() || undefined,
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
      showMsg(`${provider} store status toggled to ${!currentOnline ? "ONLINE" : "OFFLINE"}`, "info");
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
      showMsg(`Rush mode ${!currentRush ? "ENABLED (+15m prep buffer)" : "DISABLED"} on ${provider}`, "info");
      await fetchOutletMappings();
    } catch (err: any) {
      showMsg(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnmapOutlet = async (outletId: string, provider: "SWIGGY" | "ZOMATO") => {
    if (!confirm(`Remove ${provider} mapping from this outlet? Live orders for this store ID will be rejected.`)) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/integrations/aggregator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unmap_outlet",
          outletId,
          provider,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unmap outlet");
      showMsg(`Removed ${provider} mapping`, "info");
      await fetchOutletMappings();
      await fetchStatus();
    } catch (err: any) {
      showMsg(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePushMenuSync = async (provider: "SWIGGY" | "ZOMATO") => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/integrations/aggregator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push_menu_sync", provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger menu sync");
      showMsg(`Master menu push job queued for ${provider}`, "success");
      await fetchStatus();
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

  const handleDownloadCsv = () => {
    window.open("/api/integrations/aggregator?action=export_reconciliation", "_blank");
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.restronexpos.com";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* PAGE HEADER */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#172B25]">
                Online Ordering Integrations
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                Connect restaurant delivery platforms to RestroNex POS. Automatically receive online orders, manage kitchen operations and synchronise order statuses.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/integrations"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
          >
            ← Integrations Hub
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              Promise.all([fetchStatus(), fetchOutletMappings(), fetchExceptions()]).finally(() =>
                setLoading(false)
              );
            }}
            disabled={loading || actionLoading}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Status
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

      {/* ------------------------------------------------------------- */}
      {/* TABS NAVIGATION */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b text-sm font-medium">
        {[
          { key: "overview", label: "Overview & Dashboard", icon: Layers },
          { key: "swiggy", label: "Swiggy Setup Guide", icon: Zap, status: statusData?.swiggy?.status },
          { key: "zomato", label: "Zomato Setup Guide", icon: ShoppingBag, status: statusData?.zomato?.status },
          { key: "outlets", label: "Outlet Mapping", icon: Store, count: statusData?.stats?.mappedListingsCount },
          { key: "menu", label: "Menu Sync & Pricing", icon: Utensils },
          { key: "orders", label: "Live Orders & Exceptions", icon: Clock, count: statusData?.stats?.exceptionsCount > 0 ? `${statusData.stats.exceptionsCount} Alerts` : undefined },
          { key: "reconciliation", label: "Reconciliation", icon: BarChart3 },
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
              {tab.status && tab.status === "CONNECTED" && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              )}
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
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

      {/* ------------------------------------------------------------- */}
      {/* TAB: OVERVIEW & DASHBOARD */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* TWO-SCOPE MULTI-TENANT CREDENTIAL ARCHITECTURE NOTICE */}
          <Card className="border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-white shadow-2xs">
            <CardContent className="p-5">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider">
                    <Server className="w-4 h-4 text-indigo-700" />
                    Two-Scope SaaS Credential Architecture
                  </div>
                  <h3 className="text-base font-bold text-[#172B25]">
                    How RestroNex Separates Platform Partnerships from Restaurant Outlets
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    RestroNex enforces strict credential scoping. As a restaurant owner, you do <strong>not</strong> need to apply as a POS software vendor yourself:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-lg bg-white/90 border border-indigo-100 space-y-1">
                      <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        Scope 1: RestroNex Vendor Credentials
                      </div>
                      <p className="text-[11px] text-gray-600">
                        Official POS Integration agreements, developer NDAs, and master API partner tokens are secured platform-wide by RestroNex engineering in Super Admin.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/90 border border-blue-100 space-y-1">
                      <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        Scope 2: Restaurant & Outlet Configuration
                      </div>
                      <p className="text-[11px] text-gray-600">
                        You configure your restaurant listing IDs (Swiggy Store ID / Zomato Res ID), map them to your RestroNex physical branches, and enter merchant credentials if specifically issued.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
                  <div className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs text-indigo-900 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    AES-256 Vault Encrypted
                  </div>
                  <span className="text-[11px] text-gray-500">
                    Tenant Scoped & Audit Logged
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ------------------------------------------------------------- */}
          {/* SEPARATE PROVIDER CARDS (SWIGGY & ZOMATO) */}
          {/* ------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SWIGGY PROVIDER CARD */}
            <Card className="border border-orange-200/80 shadow-xs hover:shadow-md transition-all bg-gradient-to-b from-orange-50/30 to-white">
              <CardHeader className="pb-3 border-b border-orange-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-2xl shadow-sm">
                      S
                    </div>
                    <div>
                      <CardTitle className="text-lg font-black text-[#172B25] flex items-center gap-2">
                        Swiggy
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">
                          Direct Food Delivery
                        </span>
                      </CardTitle>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Connect your Swiggy restaurant listings to RestroNex POS to receive online orders and manage kitchen operations.
                      </p>
                    </div>
                  </div>
                  <IntegrationStatusBadge
                    status={statusData?.swiggy?.status || "PROVIDER_APPROVAL_REQUIRED"}
                  />
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Metric Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white border border-gray-100 text-center">
                    <div className="text-[10px] uppercase font-bold text-gray-500">Mapped Outlets</div>
                    <div className="text-base font-black text-[#172B25] mt-0.5">
                      {statusData?.stats?.swiggyMappedCount || 0} / {statusData?.stats?.swiggyListingsTarget || 1}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-gray-100 text-center">
                    <div className="text-[10px] uppercase font-bold text-gray-500">Active Live</div>
                    <div className="text-base font-black text-emerald-700 mt-0.5">
                      {statusData?.dashboard?.swiggy?.activeConnections || 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-gray-100 text-center">
                    <div className="text-[10px] uppercase font-bold text-gray-500">Pending Setup</div>
                    <div className="text-base font-black text-amber-700 mt-0.5">
                      {statusData?.dashboard?.swiggy?.pendingConfigurations || 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-gray-100 text-center">
                    <div className="text-[10px] uppercase font-bold text-gray-500">Failed / Errors</div>
                    <div className="text-base font-black text-gray-700 mt-0.5">
                      {statusData?.dashboard?.swiggy?.failedVerificationCount || 0}
                    </div>
                  </div>
                </div>

                {/* Integration Details info row */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 text-xs space-y-1.5 text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Webhook Gateway:</span>
                    <span className="font-mono text-[11px] text-gray-600">/api/webhooks/swiggy</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Last Received Webhook:</span>
                    <span className="text-[11px] text-gray-600">
                      {statusData?.dashboard?.swiggy?.lastReceivedWebhook
                        ? new Date(statusData.dashboard.swiggy.lastReceivedWebhook).toLocaleString()
                        : "Awaiting first signed delivery"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">API Credentials Vault:</span>
                    <span className="text-[11px] font-bold text-indigo-700">
                      {statusData?.swiggy?.hasCredentials ? "Configured (AES-256 Encrypted)" : "Not configured"}
                    </span>
                  </div>
                </div>

                {/* Provider Card Action Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("swiggy")}
                    className="text-xs font-bold border-orange-200 hover:bg-orange-50 text-orange-950"
                  >
                    Setup Guide
                  </Button>
                  <a
                    href="https://mcp.swiggy.com/builders/enterprises/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-800 gap-1"
                  >
                    Obtain API <ExternalLink className="w-3 h-3 text-gray-500" />
                  </a>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("swiggy")}
                    className="text-xs font-bold bg-[#16845B] hover:bg-[#126b4a] text-white"
                  >
                    Configure
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("outlets")}
                    className="text-xs font-bold"
                  >
                    Manage Outlets
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ZOMATO PROVIDER CARD */}
            <Card className="border border-red-200/80 shadow-xs hover:shadow-md transition-all bg-gradient-to-b from-red-50/30 to-white">
              <CardHeader className="pb-3 border-b border-red-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black text-2xl shadow-sm">
                      Z
                    </div>
                    <div>
                      <CardTitle className="text-lg font-black text-[#172B25] flex items-center gap-2">
                        Zomato
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-100 text-red-800">
                          Order Relay & KDS
                        </span>
                      </CardTitle>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Connect your Zomato restaurant listings to RestroNex POS for automated order processing, menu synchronisation and kitchen management.
                      </p>
                    </div>
                  </div>
                  <IntegrationStatusBadge
                    status={statusData?.zomato?.status || "PROVIDER_APPROVAL_REQUIRED"}
                  />
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Metric Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-white border border-gray-100 text-center">
                    <div className="text-[10px] uppercase font-bold text-gray-500">Mapped Outlets</div>
                    <div className="text-base font-black text-[#172B25] mt-0.5">
                      {statusData?.stats?.zomatoMappedCount || 0} / {statusData?.stats?.zomatoListingsTarget || 1}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-gray-100 text-center">
                    <div className="text-[10px] uppercase font-bold text-gray-500">Active Live</div>
                    <div className="text-base font-black text-emerald-700 mt-0.5">
                      {statusData?.dashboard?.zomato?.activeConnections || 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-gray-100 text-center">
                    <div className="text-[10px] uppercase font-bold text-gray-500">Pending Setup</div>
                    <div className="text-base font-black text-amber-700 mt-0.5">
                      {statusData?.dashboard?.zomato?.pendingConfigurations || 0}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-gray-100 text-center">
                    <div className="text-[10px] uppercase font-bold text-gray-500">Failed / Errors</div>
                    <div className="text-base font-black text-gray-700 mt-0.5">
                      {statusData?.dashboard?.zomato?.failedVerificationCount || 0}
                    </div>
                  </div>
                </div>

                {/* Integration Details info row */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 text-xs space-y-1.5 text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Webhook Gateway:</span>
                    <span className="font-mono text-[11px] text-gray-600">/api/webhooks/zomato</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Last Received Webhook:</span>
                    <span className="text-[11px] text-gray-600">
                      {statusData?.dashboard?.zomato?.lastReceivedWebhook
                        ? new Date(statusData.dashboard.zomato.lastReceivedWebhook).toLocaleString()
                        : "Awaiting first signed delivery"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">API Credentials Vault:</span>
                    <span className="text-[11px] font-bold text-indigo-700">
                      {statusData?.zomato?.hasCredentials ? "Configured (AES-256 Encrypted)" : "Not configured"}
                    </span>
                  </div>
                </div>

                {/* Provider Card Action Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("zomato")}
                    className="text-xs font-bold border-red-200 hover:bg-red-50 text-red-950"
                  >
                    Setup Guide
                  </Button>
                  <a
                    href="https://www.zomato.com/developer/integration/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-800 gap-1"
                  >
                    Developer Portal <ExternalLink className="w-3 h-3 text-gray-500" />
                  </a>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("zomato")}
                    className="text-xs font-bold bg-[#16845B] hover:bg-[#126b4a] text-white"
                  >
                    Configure
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("outlets")}
                    className="text-xs font-bold"
                  >
                    Manage Outlets
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* RECENT INTEGRATION ERRORS & EXCEPTION QUEUE */}
          {/* ------------------------------------------------------------- */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[#172B25] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Recent Integration Ingestion & Routing Exceptions
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Unmapped Store IDs, unregistered listings, and order payload warnings are isolated here.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("orders")}
                className="text-xs font-semibold"
              >
                View Exception Queue ({statusData?.stats?.exceptionsCount || 0})
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {statusData?.dashboard?.recentErrors && statusData.dashboard.recentErrors.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {statusData.dashboard.recentErrors.map((err: any) => (
                    <div key={err.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 font-bold uppercase rounded-md text-[10px] ${
                              err.provider === "SWIGGY"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {err.provider}
                          </span>
                          <span className="font-bold text-gray-900">{err.errorType}</span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(err.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-600">{err.reason}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab("outlets")}
                        className="text-[11px] shrink-0"
                      >
                        Fix Mapping
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-gray-500 space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <p className="font-semibold text-gray-700">Zero Ingestion Exceptions</p>
                  <p className="text-gray-500">All inbound aggregator webhooks and store mappings are operating cleanly.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB: SWIGGY SETUP GUIDE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "swiggy" && (
        <div className="space-y-6">
          <Card className="border border-orange-200">
            <CardHeader className="pb-4 border-b bg-gradient-to-r from-orange-50/50 to-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-2xl shadow-sm">
                    S
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#172B25]">Swiggy Official Setup Guide</h2>
                    <p className="text-xs text-gray-600">
                      Connect your Swiggy restaurant listings to RestroNex POS to receive online orders and manage kitchen operations.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IntegrationStatusBadge status={statusData?.swiggy?.status || "PROVIDER_APPROVAL_REQUIRED"} />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-8">
              {/* STEP 1 */}
              <div className="space-y-3 border-l-2 border-orange-500 pl-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-black flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-[#172B25]">
                    Step 1 — Request official integration access
                  </h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  This is Swiggy Builders Club&apos;s enterprise application for its commerce MCP platform. It is not confirmed as the merchant-side restaurant POS order-relay API. Contact Swiggy to obtain confirmation and the correct restaurant POS partnership onboarding route.
                </p>

                <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-orange-950">Swiggy Builders Club Enterprise Portal:</div>
                    <a
                      href="https://mcp.swiggy.com/builders/enterprises/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-orange-800 underline font-mono flex items-center gap-1"
                    >
                      https://mcp.swiggy.com/builders/enterprises/ <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href="mailto:builders@swiggy.in?subject=RestroNex%20POS%20Merchant%20Integration%20Request"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition shadow-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Contact Swiggy Partnership Team
                    </a>
                  </div>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="space-y-3 border-l-2 border-orange-500 pl-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-black flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-[#172B25]">
                    Step 2 — Obtain merchant POS API credentials
                  </h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Obtain merchant-side POS integration approval and official API authentication details directly from the Swiggy partnership team. Do not use consumer MCP OAuth credentials as merchant POS credentials.
                </p>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p>
                    <strong>Provider Advisory:</strong> Swiggy issues partner API credentials strictly following official merchant POS agreements. These credentials are not self-service or publicly generatable.
                  </p>
                </div>

                {/* Authorized Configuration Form */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-gray-500" />
                      Authorized Swiggy Merchant POS Credentials (AES-256 Vault)
                    </h4>
                    {statusData?.swiggy?.hasCredentials && (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Secured in Database
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Partner Client ID</Label>
                      <Input
                        placeholder={statusData?.swiggy?.partnerClientId || "e.g. swg_partner_client_..."}
                        value={swiggyCreds.partnerClientId}
                        onChange={(e) => setSwiggyCreds({ ...swiggyCreds, partnerClientId: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Partner Token / API Secret</Label>
                      <div className="relative">
                        <Input
                          type={showSwiggySecret ? "text" : "password"}
                          placeholder={statusData?.swiggy?.maskedApiKey || "swg_live_token_..."}
                          value={swiggyCreds.apiKey}
                          onChange={(e) => setSwiggyCreds({ ...swiggyCreds, apiKey: e.target.value })}
                          className="text-xs font-mono pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSwiggySecret(!showSwiggySecret)}
                          className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showSwiggySecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Webhook Signing Secret (HMAC-SHA256)</Label>
                      <Input
                        type="password"
                        placeholder={statusData?.swiggy?.maskedWebhookSecret || "Used for cryptographic payload verification"}
                        value={swiggyCreds.webhookSecret}
                        onChange={(e) => setSwiggyCreds({ ...swiggyCreds, webhookSecret: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Merchant ID / Account Ref</Label>
                      <Input
                        placeholder={statusData?.swiggy?.merchantId || "e.g. SWG-MERCHANT-8492"}
                        value={swiggyCreds.merchantId}
                        onChange={(e) => setSwiggyCreds({ ...swiggyCreds, merchantId: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-gray-500">
                      Stored encrypted at rest on server. Never returned in plaintext to browser responses.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleSaveConnection("SWIGGY")}
                      disabled={actionLoading}
                      className="bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-semibold"
                    >
                      Save Swiggy Credentials
                    </Button>
                  </div>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="space-y-3 border-l-2 border-orange-500 pl-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-black flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-[#172B25]">
                    Step 3 — Obtain Swiggy Store ID
                  </h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Ask Swiggy&apos;s restaurant partner/account manager or approved POS integration team for the correct external restaurant/store ID for each listing.
                </p>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                  <div className="text-xs font-bold text-gray-800">
                    Quick Assign Store ID to RestroNex Outlet:
                  </div>
                  <form onSubmit={handleMapOutlet} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
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
                    <div className="space-y-1">
                      <Label className="text-xs">Swiggy Restaurant / Store ID</Label>
                      <Input
                        placeholder="e.g. 543210 (Provided by Swiggy)"
                        value={mapStoreId}
                        onChange={(e) => {
                          setMapProvider("SWIGGY");
                          setMapStoreId(e.target.value);
                        }}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        Save Store Mapping
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* STEP 4 */}
              <div className="space-y-3 border-l-2 border-orange-500 pl-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-black flex items-center justify-center">
                    4
                  </span>
                  <h3 className="text-sm font-bold text-[#172B25]">
                    Step 4 — Complete outlet mapping
                  </h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Every Swiggy store ID must be mapped to a corresponding RestroNex physical outlet. Multiple mappings per restaurant tenant are supported.
                </p>

                {/* Outlet mappings preview table */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b text-gray-600 font-bold">
                      <tr>
                        <th className="p-3">RestroNex Business</th>
                        <th className="p-3">RestroNex Outlet</th>
                        <th className="p-3">Swiggy Store ID</th>
                        <th className="p-3">Mapping Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {outletMappings.flatMap((o) =>
                        o.mappings
                          .filter((m: any) => m.provider === "SWIGGY")
                          .map((m: any) => (
                            <tr key={m.id} className="hover:bg-gray-50/50">
                              <td className="p-3 font-semibold text-[#172B25]">
                                {statusData?.businessStructure?.brandName || "Restaurant Brand"}
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-[#172B25]">{o.outletName}</div>
                                <div className="text-[10px] text-gray-500">{o.outletAddress}</div>
                              </td>
                              <td className="p-3 font-mono font-bold text-orange-950">
                                {m.providerStoreId}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    m.isOnline
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {m.isOnline ? "ACTIVE MAPPED" : "OFFLINE"}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleUnmapOutlet(o.outletId, "SWIGGY")}
                                  className="text-red-600 hover:text-red-800 font-bold text-xs"
                                >
                                  Disconnect
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                      {outletMappings.every((o) => !o.mappings.some((m: any) => m.provider === "SWIGGY")) && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-500 italic">
                            No Swiggy store listings mapped yet. Use Step 3 above to map your first store ID.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* STEP 5 */}
              <div className="space-y-3 border-l-2 border-orange-500 pl-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-black flex items-center justify-center">
                    5
                  </span>
                  <h3 className="text-sm font-bold text-[#172B25]">
                    Step 5 — Verify connection
                  </h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Only mark Connected when the official integration has been approved, valid credentials have been configured and a real provider verification succeeds. Until then, display: <strong>&ldquo;Partner approval required&rdquo;</strong>.
                </p>

                {/* Verification matrix card */}
                <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-orange-950">
                      Live Verification Status:
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleTestVerification("SWIGGY")}
                      disabled={actionLoading}
                      className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold"
                    >
                      Run Provider Verification Test
                    </Button>
                  </div>
                  <VerificationStageList stages={statusData?.verificationStages?.swiggy} />
                </div>
              </div>

              {/* DEDICATED WEBHOOK URL FOR ACCOUNT MANAGER */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="text-xs font-bold text-gray-800">
                  Swiggy Webhook Delivery Endpoint:
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200 font-mono text-gray-800 flex-1 overflow-x-auto">
                    {`${origin}/api/webhooks/swiggy`}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs shrink-0"
                    onClick={() => copyToClipboard(`${origin}/api/webhooks/swiggy`, "swiggy_url")}
                  >
                    {copiedKey === "swiggy_url" ? "Copied!" : "Copy Webhook URL"}
                  </Button>
                </div>
                <p className="text-[11px] text-gray-500">
                  Provide this endpoint to your Swiggy Merchant POC or input it into your Swiggy Developer Portal.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB: ZOMATO SETUP GUIDE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "zomato" && (
        <div className="space-y-6">
          <Card className="border border-red-200">
            <CardHeader className="pb-4 border-b bg-gradient-to-r from-red-50/50 to-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black text-2xl shadow-sm">
                    Z
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#172B25]">Zomato Official Setup Guide</h2>
                    <p className="text-xs text-gray-600">
                      Connect your Zomato restaurant listings to RestroNex POS for automated order processing, menu synchronisation and kitchen management.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IntegrationStatusBadge status={statusData?.zomato?.status || "PROVIDER_APPROVAL_REQUIRED"} />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-8">
              {/* OFFICIAL LINKS CALLOUT BANNER */}
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3">
                <div className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-red-700" />
                  Official Zomato POS Developer Documentation & Support Channels:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  <a
                    href="https://www.zomato.com/developer/integration/"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-lg bg-white border border-red-100 hover:border-red-300 font-semibold text-red-900 flex items-center justify-between transition"
                  >
                    <span>POS Developer Platform</span>
                    <ExternalLink className="w-3.5 h-3.5 text-red-600" />
                  </a>
                  <a
                    href="https://www.zomato.com/developer/integration/docs/overview/"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-lg bg-white border border-red-100 hover:border-red-300 font-semibold text-red-900 flex items-center justify-between transition"
                  >
                    <span>Integration Overview</span>
                    <ExternalLink className="w-3.5 h-3.5 text-red-600" />
                  </a>
                  <a
                    href="https://www.zomato.com/developer/integration/docs/getting-started/development-for-integration/pre-integration/"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-lg bg-white border border-red-100 hover:border-red-300 font-semibold text-red-900 flex items-center justify-between transition"
                  >
                    <span>Pre-Integration Guide</span>
                    <ExternalLink className="w-3.5 h-3.5 text-red-600" />
                  </a>
                  <a
                    href="https://www.zomato.com/developer/integration/docs/getting-started/milestones/"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-lg bg-white border border-red-100 hover:border-red-300 font-semibold text-red-900 flex items-center justify-between transition"
                  >
                    <span>Milestones & Guidelines</span>
                    <ExternalLink className="w-3.5 h-3.5 text-red-600" />
                  </a>
                  <a
                    href="mailto:pos-partnership@zomato.com"
                    className="p-2.5 rounded-lg bg-white border border-red-100 hover:border-red-300 font-semibold text-red-900 flex items-center justify-between transition sm:col-span-2 lg:col-span-1"
                  >
                    <span>pos-partnership@zomato.com</span>
                    <Mail className="w-3.5 h-3.5 text-red-600" />
                  </a>
                </div>
              </div>

              {/* STEP 1 */}
              <div className="space-y-3 border-l-2 border-red-600 pl-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-[#172B25]">
                    Step 1 — Apply for POS integration
                  </h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  RestroNex must complete Zomato&apos;s POS vendor onboarding process, including the required forms and NDA. Zomato will assign a point of contact.
                </p>
                <div>
                  <a
                    href="https://www.zomato.com/developer/integration/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Zomato POS Developer Platform
                  </a>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="space-y-3 border-l-2 border-red-600 pl-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-[#172B25]">
                    Step 2 — Obtain Zomato API credentials
                  </h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Zomato&apos;s POS point of contact provides the POS ID and API authentication credentials after the vendor onboarding and configuration process. Do not allow restaurants to assume they can generate these credentials independently.
                </p>

                {/* Authorized Configuration Form */}
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-gray-500" />
                      Authorized Zomato POS Credentials (AES-256 Vault)
                    </h4>
                    {statusData?.zomato?.hasCredentials && (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Secured in Database
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Zomato POS ID</Label>
                      <Input
                        placeholder={statusData?.zomato?.posId || "e.g. zom_pos_id_..."}
                        value={zomatoCreds.posId}
                        onChange={(e) => setZomatoCreds({ ...zomatoCreds, posId: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">API Key / Authentication Token</Label>
                      <div className="relative">
                        <Input
                          type={showZomatoSecret ? "text" : "password"}
                          placeholder={statusData?.zomato?.maskedApiKey || "zom_api_token_..."}
                          value={zomatoCreds.apiKey}
                          onChange={(e) => setZomatoCreds({ ...zomatoCreds, apiKey: e.target.value })}
                          className="text-xs font-mono pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowZomatoSecret(!showZomatoSecret)}
                          className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showZomatoSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Webhook Authentication Secret / Bearer</Label>
                      <Input
                        type="password"
                        placeholder={statusData?.zomato?.maskedWebhookSecret || "Used for Bearer token & HMAC verification"}
                        value={zomatoCreds.webhookSecret}
                        onChange={(e) => setZomatoCreds({ ...zomatoCreds, webhookSecret: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Default Zomato Restaurant ID (res_id)</Label>
                      <Input
                        placeholder={statusData?.zomato?.merchantId || "e.g. 19284012"}
                        value={zomatoCreds.merchantId}
                        onChange={(e) => setZomatoCreds({ ...zomatoCreds, merchantId: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-gray-500">
                      Stored encrypted at rest on server. Never exposed to browser logs or frontend state.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleSaveConnection("ZOMATO")}
                      disabled={actionLoading}
                      className="bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-semibold"
                    >
                      Save Zomato Credentials
                    </Button>
                  </div>
                </div>
              </div>

              {/* STEP 3 */}
              <div className="space-y-3 border-l-2 border-red-600 pl-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-[#172B25]">
                    Step 3 — Obtain Zomato Restaurant ID / Store ID
                  </h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  During testing, Zomato provides the test restaurant/store ID to the POS vendor. For live restaurants, confirm the correct Zomato restaurant ID (res_id) and mapping with the Zomato POC or approved restaurant integration process.
                </p>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                  <div className="text-xs font-bold text-gray-800">
                    Quick Assign Zomato Res ID to RestroNex Outlet:
                  </div>
                  <form onSubmit={handleMapOutlet} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
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
                    <div className="space-y-1">
                      <Label className="text-xs">Zomato Restaurant ID (res_id)</Label>
                      <Input
                        placeholder="e.g. 19284012 (From Zomato)"
                        value={mapStoreId}
                        onChange={(e) => {
                          setMapProvider("ZOMATO");
                          setMapStoreId(e.target.value);
                        }}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
                      >
                        Save Zomato Res ID
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* STEP 4 */}
              <div className="space-y-3 border-l-2 border-red-600 pl-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center">
                    4
                  </span>
                  <h3 className="text-sm font-bold text-[#172B25]">
                    Step 4 — Map Zomato outlets
                  </h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Map each physical branch to its respective Zomato Res ID. Multiple Zomato listings and multiple physical outlets are supported simultaneously.
                </p>

                {/* Outlet mappings preview table */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b text-gray-600 font-bold">
                      <tr>
                        <th className="p-3">RestroNex Business</th>
                        <th className="p-3">RestroNex Outlet</th>
                        <th className="p-3">Zomato Res ID</th>
                        <th className="p-3">Mapping Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {outletMappings.flatMap((o) =>
                        o.mappings
                          .filter((m: any) => m.provider === "ZOMATO")
                          .map((m: any) => (
                            <tr key={m.id} className="hover:bg-gray-50/50">
                              <td className="p-3 font-semibold text-[#172B25]">
                                {statusData?.businessStructure?.brandName || "Restaurant Brand"}
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-[#172B25]">{o.outletName}</div>
                                <div className="text-[10px] text-gray-500">{o.outletAddress}</div>
                              </td>
                              <td className="p-3 font-mono font-bold text-red-950">
                                {m.providerStoreId}
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    m.isOnline
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {m.isOnline ? "ACTIVE MAPPED" : "OFFLINE"}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleUnmapOutlet(o.outletId, "ZOMATO")}
                                  className="text-red-600 hover:text-red-800 font-bold text-xs"
                                >
                                  Disconnect
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                      {outletMappings.every((o) => !o.mappings.some((m: any) => m.provider === "ZOMATO")) && (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-gray-500 italic">
                            No Zomato restaurant listings mapped yet. Use Step 3 above to map your first Res ID.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* STEP 5 */}
              <div className="space-y-3 border-l-2 border-red-600 pl-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center">
                    5
                  </span>
                  <h3 className="text-sm font-bold text-[#172B25]">
                    Step 5 — Verify connection
                  </h3>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Test only against official approved endpoints using real credentials. Never display Connected simply because fields were filled.
                </p>

                {/* Verification matrix card */}
                <div className="p-4 rounded-xl bg-red-50/50 border border-red-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-red-950">
                      Live Verification Status:
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleTestVerification("ZOMATO")}
                      disabled={actionLoading}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                    >
                      Run Provider Verification Test
                    </Button>
                  </div>
                  <VerificationStageList stages={statusData?.verificationStages?.zomato} />
                </div>
              </div>

              {/* DEDICATED WEBHOOK URL FOR ZOMATO DASHBOARD */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <div className="text-xs font-bold text-gray-800">
                  Zomato Webhook Delivery Endpoint:
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-white px-3 py-1.5 rounded-lg border border-gray-200 font-mono text-gray-800 flex-1 overflow-x-auto">
                    {`${origin}/api/webhooks/zomato`}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs shrink-0"
                    onClick={() => copyToClipboard(`${origin}/api/webhooks/zomato`, "zomato_url")}
                  >
                    {copiedKey === "zomato_url" ? "Copied!" : "Copy Webhook URL"}
                  </Button>
                </div>
                <p className="text-[11px] text-gray-500">
                  Configure this Relay URL in your Zomato Merchant Dashboard or share it with your assigned POS Integration POC.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB: OUTLET MAPPINGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "outlets" && (
        <div className="space-y-6">
          {/* Brand Multi-Outlet Architecture Card */}
          <Card className="border border-blue-200 bg-blue-50/40">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
                    <Store className="w-4 h-4 text-blue-700" />
                    Brand Multi-Outlet Listing Architecture ({statusData?.businessStructure?.brandName || "Restaurant Brand"})
                  </h4>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Brand topology: <strong>{statusData?.stats?.physicalOutletsCount || 1} physical {statusData?.stats?.physicalOutletsCount === 1 ? "outlet" : "outlets"}</strong> and <strong>{statusData?.stats?.totalListingsTarget || (statusData?.stats?.physicalOutletsCount || 1) * 2} external listing slots</strong>
                    <span className="block mt-1">
                      • <strong>Swiggy ({statusData?.stats?.swiggyListingsTarget || statusData?.stats?.physicalOutletsCount || 1} Listings)</strong>: 1-to-1 Store ID mapped to physical outlets.
                    </span>
                    <span className="block">
                      • <strong>Zomato ({statusData?.stats?.zomatoListingsTarget || statusData?.stats?.physicalOutletsCount || 1} Listings)</strong>: Dedicated Res ID mapped to physical outlets.
                    </span>
                  </p>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-white border border-blue-200 text-left sm:text-right shrink-0">
                  <div className="text-[10px] font-bold uppercase text-gray-500">Mapping Progress</div>
                  <div className="text-lg font-black text-blue-900">
                    {statusData?.stats?.mappedListingsCount || 0} / {statusData?.stats?.totalListingsTarget || 2} Listings
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {statusData?.stats?.physicalOutletsCount || 1} Physical Outlets
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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
                    <option value="SWIGGY">Swiggy (Store ID)</option>
                    <option value="ZOMATO">Zomato (Res ID)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">External Store / Res ID</Label>
                  <Input
                    placeholder="e.g. 543210 or 19284012"
                    value={mapStoreId}
                    onChange={(e) => setMapStoreId(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Display Label (Optional)</Label>
                  <Input
                    placeholder="e.g. Swiggy - Main Counter"
                    value={mapStoreName}
                    onChange={(e) => setMapStoreName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full text-xs font-semibold bg-[#16845B] hover:bg-[#126b4a] text-white"
                  >
                    Save Mapping
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Outlets Listing Table */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#172B25]">Active Outlet Mappings & Controls</h3>
            <div className="space-y-4">
              {outletMappings.map((outlet) => (
                <Card key={outlet.outletId} className="border border-gray-200 shadow-2xs">
                  <CardHeader className="p-4 bg-gray-50 border-b flex flex-row items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-[#172B25] flex items-center gap-2">
                        <Store className="w-4 h-4 text-emerald-600" />
                        {outlet.outletName}
                      </div>
                      <div className="text-xs text-gray-500">{outlet.outletAddress || "Address on file"}</div>
                    </div>
                    <span className="text-xs font-bold text-gray-600">
                      {outlet.mappings.length} Active Mappings
                    </span>
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-gray-100">
                    {outlet.mappings.length > 0 ? (
                      outlet.mappings.map((m: any) => (
                        <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                m.provider === "SWIGGY"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {m.provider === "SWIGGY" ? "S" : "Z"}
                            </span>
                            <div>
                              <div className="font-bold text-gray-900 flex items-center gap-2">
                                <span>{m.provider}</span>
                                <span className="font-mono text-gray-500">ID: {m.providerStoreId}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    m.isOnline
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {m.isOnline ? "ONLINE" : "OFFLINE"}
                                </span>
                                {m.isRushMode && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    RUSH (+15m)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {m.providerStoreName} • Auto-offline on close: {m.autoOfflineOnClose ? "Yes" : "No"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant={m.isOnline ? "outline" : "default"}
                              onClick={() => handleToggleStoreStatus(outlet.outletId, m.provider, m.isOnline)}
                              disabled={actionLoading}
                              className="text-xs h-8"
                            >
                              {m.isOnline ? "Set Offline" : "Set Online"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleRushMode(outlet.outletId, m.provider, m.isRushMode)}
                              disabled={actionLoading}
                              className={`text-xs h-8 ${m.isRushMode ? "bg-amber-50 text-amber-800 border-amber-300" : ""}`}
                            >
                              {m.isRushMode ? "Disable Rush" : "Rush Mode"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUnmapOutlet(outlet.outletId, m.provider)}
                              disabled={actionLoading}
                              className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Disconnect
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-xs text-gray-500 italic text-center">
                        No aggregator mappings for this outlet yet. Use the form above to connect Swiggy or Zomato.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB: MENU SYNCHRONISATION */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "menu" && (
        <div className="space-y-6">
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-[#172B25] flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-emerald-600" />
                  Master Catalog to Aggregator Menu Sync
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Push menu items, categories, variants, and price markups to Swiggy & Zomato
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handlePushMenuSync("SWIGGY")}
                  disabled={actionLoading}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold"
                >
                  Push to Swiggy
                </Button>
                <Button
                  onClick={() => handlePushMenuSync("ZOMATO")}
                  disabled={actionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                >
                  Push to Zomato
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Strategy Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Aggregator Platform</Label>
                  <select
                    value={menuProvider}
                    onChange={(e) => {
                      const p = e.target.value as "SWIGGY" | "ZOMATO";
                      setMenuProvider(p);
                      fetchMenuPreview(p, menuStrategy, menuHikeValue);
                    }}
                    className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 bg-white"
                  >
                    <option value="SWIGGY">Swiggy Menu Catalog</option>
                    <option value="ZOMATO">Zomato Menu Catalog</option>
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
                    <option value="PERCENTAGE_HIKE">Percentage Markup (+%)</option>
                    <option value="FIXED_HIKE">Fixed Markup (+₹)</option>
                    <option value="MASTER_EQUAL">Same as POS Menu (0% Markup)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Markup Value</Label>
                  <Input
                    type="number"
                    value={menuHikeValue}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setMenuHikeValue(v);
                      fetchMenuPreview(menuProvider, menuStrategy, v);
                    }}
                    placeholder="15"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Items Preview Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Live Menu Preview ({menuPreview?.totalItems || 0} Items across {menuPreview?.totalCategories || 0} Categories)
                  </h4>
                  <span className="text-xs text-gray-500">
                    Active Markup: {menuStrategy === "PERCENTAGE_HIKE" ? `+${menuHikeValue}%` : menuStrategy === "FIXED_HIKE" ? `+₹${menuHikeValue}` : "Equal to POS"}
                  </span>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b text-gray-600 font-bold">
                      <tr>
                        <th className="p-3">Item Name</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Base POS Price</th>
                        <th className="p-3">Aggregator Price</th>
                        <th className="p-3 text-right">86 Stock Toggle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {menuPreview?.items && menuPreview.items.length > 0 ? (
                        menuPreview.items.slice(0, 15).map((it: any) => (
                          <tr key={it.id} className="hover:bg-gray-50/50">
                            <td className="p-3">
                              <div className="font-bold text-[#172B25]">{it.name}</div>
                              <div className="text-[10px] text-gray-400">ID: {it.id}</div>
                            </td>
                            <td className="p-3 text-gray-600">{it.categoryName}</td>
                            <td className="p-3 font-mono font-medium text-gray-700">
                              ₹{(it.basePricePaise / 100).toFixed(2)}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-700">
                              ₹{(it.aggregatorPricePaise / 100).toFixed(2)}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                variant={it.isAvailable ? "outline" : "destructive"}
                                onClick={() => handleToggleItemAvailability(it.id, it.isAvailable)}
                                className="text-[11px] h-7 font-bold"
                              >
                                {it.isAvailable ? "In Stock (86)" : "Sold Out"}
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-gray-500 italic">
                            Loading catalog items...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB: LIVE ORDERS & EXCEPTIONS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[#172B25] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Aggregator Exception Queue & Ingestion Audit
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Orders rejected due to unmapped stores or invalid signatures are captured here for troubleshooting.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchExceptions}
                className="text-xs font-semibold"
              >
                Refresh Queue
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {exceptions.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {exceptions.map((exc) => (
                    <div key={exc.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              exc.provider === "SWIGGY"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {exc.provider}
                          </span>
                          <span className="text-xs font-bold text-gray-900">{exc.errorType}</span>
                          {exc.externalOrderId && (
                            <span className="text-xs font-mono text-gray-500">Ref: {exc.externalOrderId}</span>
                          )}
                          <span className="text-[11px] text-gray-400">
                            {new Date(exc.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            exc.isResolved
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {exc.isResolved ? "RESOLVED" : "UNRESOLVED"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700">{exc.reason}</p>
                      {exc.payloadJson && (
                        <details className="text-[11px] text-gray-500">
                          <summary className="cursor-pointer hover:underline text-gray-600">
                            View Payload Snippet
                          </summary>
                          <pre className="mt-1 p-2 bg-gray-50 rounded border text-[10px] overflow-x-auto">
                            {exc.payloadJson.slice(0, 300)}...
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-gray-500 space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-semibold text-gray-700">Exception Queue is Empty</p>
                  <p className="text-gray-500">No unmapped store IDs or failed webhook ingestion events recorded.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB: RECONCILIATION */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "reconciliation" && (
        <div className="space-y-6">
          <Card className="border border-gray-200">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-[#172B25] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Aggregator Payout & Order Reconciliation
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Compare aggregator payouts, discounts, commissions, and taxes against RestroNex POS billed orders.
                </p>
              </div>
              <Button
                onClick={handleDownloadCsv}
                variant="outline"
                size="sm"
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export Reconciliation CSV
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-xs font-bold text-gray-500 uppercase">Gross Volume</div>
                  <div className="text-xl font-black text-[#172B25] mt-1">
                    ₹{((reconciliation?.summary?.totalGrossPaise || 0) / 100).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {reconciliation?.summary?.totalOrders || 0} Total Orders
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-xs font-bold text-gray-500 uppercase">Customer Discounts</div>
                  <div className="text-xl font-black text-amber-700 mt-1">
                    ₹{((reconciliation?.summary?.totalDiscountsPaise || 0) / 100).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">Funded by merchant / app</div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-xs font-bold text-gray-500 uppercase">Est. Commissions</div>
                  <div className="text-xl font-black text-red-700 mt-1">
                    ₹{((reconciliation?.summary?.totalCommissionPaise || 0) / 100).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">~18% platform commission</div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-800 uppercase">Net Payout Est.</div>
                  <div className="text-xl font-black text-emerald-800 mt-1">
                    ₹{((reconciliation?.summary?.totalNetPayoutPaise || 0) / 100).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">Deposited to bank account</div>
                </div>
              </div>

              {/* Orders Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b text-gray-600 font-bold">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Platform</th>
                      <th className="p-3">Gross Amount</th>
                      <th className="p-3">Taxes</th>
                      <th className="p-3">Est. Commission</th>
                      <th className="p-3">Net Payout</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reconciliation?.rows && reconciliation.rows.length > 0 ? (
                      reconciliation.rows.map((r: any) => (
                        <tr key={r.providerOrderId} className="hover:bg-gray-50/50">
                          <td className="p-3 font-mono font-bold text-[#172B25]">{r.providerOrderId}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.provider === "SWIGGY"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {r.provider}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-medium">₹{r.grossAmount.toFixed(2)}</td>
                          <td className="p-3 font-mono text-gray-600">₹{r.taxes.toFixed(2)}</td>
                          <td className="p-3 font-mono text-red-600">₹{r.commission.toFixed(2)}</td>
                          <td className="p-3 font-mono font-bold text-emerald-700">₹{r.netPayout.toFixed(2)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-gray-500 italic">
                          No settled aggregator orders to display for this period.
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
    </div>
  );
}
