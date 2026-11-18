"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users,
  Sparkles,
  Star,
  MessageSquare,
  BarChart3,
  CreditCard,
  Calendar,
  Award,
  ExternalLink,
  Send,
  Mail,
  PieChart,
  Clock,
  FileCheck,
  TrendingUp,
  Building2,
  QrCode,
  Coins,
  ShieldAlert,
  Table2,
  ChefHat,
  FileText,
  Wallet,
  Plug,
  Smartphone,
  Box,
  ShoppingCart,
  ArrowDownUp,
  Printer,
  Receipt,
  Bell,
  ShieldCheck,
  Database,
  Cpu,
  Scale,
  Mic,
  Brain,
  Car,
  Tag,
  Globe,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  Settings,
  RefreshCw,
  PowerOff,
  Lock,
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  Users,
  Sparkles,
  Star,
  MessageSquare,
  BarChart3,
  CreditCard,
  Calendar,
  Award,
  ExternalLink,
  Send,
  Mail,
  PieChart,
  Clock,
  FileCheck,
  TrendingUp,
  Building2,
  QrCode,
  Coins,
  ShieldAlert,
  Table2,
  ChefHat,
  FileText,
  Wallet,
  Plug,
  Smartphone,
  Box,
  ShoppingCart,
  ArrowDownUp,
  Printer,
  Receipt,
  Bell,
  ShieldCheck,
  Database,
  Cpu,
  Scale,
  Mic,
  Brain,
  Car,
  Tag,
  Globe,
  FileSpreadsheet,
};

interface MarketplaceServiceDTO {
  id: string;
  name: string;
  category: "crm" | "analytics" | "service" | "operations";
  description: string;
  iconName: string;
  badge?: string | null;
  implementationStatus: "OPERATIONAL" | "CONFIG_REQUIRED" | "PLANNED";
  requiredPlanTier: "STARTER" | "GROWTH" | "SCALE";
  targetRoute?: string | null;
  configRoute?: string | null;
  isCoreDefault: boolean;
  lifecycleStatus: string;
  isRestricted: boolean;
  activatedAt?: string | null;
  applicableOutletId?: string | null;
}

interface MarketplaceApiResponse {
  services: MarketplaceServiceDTO[];
  totalCount: number;
  planTier: "STARTER" | "GROWTH" | "SCALE";
  planName: string;
  activeAddonsCount: number;
  allowedAddonsLimit: number;
  isOwnerOrManager: boolean;
  tenantId: string;
}

export default function MarketplaceClient() {
  const [data, setData] = useState<MarketplaceApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/marketplace");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ type: "error", message: err.error || "Failed to load marketplace data" });
      }
    } catch {
      setFeedback({ type: "error", message: "Network connection error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  async function handleActivate(serviceId: string) {
    setActivatingId(serviceId);
    setFeedback(null);
    try {
      const res = await apiFetch("/api/marketplace/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      const result = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", message: result.message || "Service activated successfully!" });
        await loadCatalog();
      } else {
        setFeedback({ type: "error", message: result.error || "Failed to activate service" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to connect to marketplace server" });
    } finally {
      setActivatingId(null);
    }
  }

  async function handleDeactivate(serviceId: string) {
    if (!confirm("Are you sure you want to deactivate this add-on module?")) return;
    setDeactivatingId(serviceId);
    setFeedback(null);
    try {
      const res = await apiFetch("/api/marketplace/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      const result = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", message: result.message || "Service deactivated successfully." });
        await loadCatalog();
      } else {
        setFeedback({ type: "error", message: result.error || "Failed to deactivate service" });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to deactivate service" });
    } finally {
      setDeactivatingId(null);
    }
  }

  // Filter and search catalog items
  const filteredServices = useMemo(() => {
    if (!data?.services) return [];
    return data.services.filter((svc) => {
      // Category filter
      if (selectedCategory !== "ALL" && svc.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (selectedStatus === "ACTIVE" && svc.lifecycleStatus !== "ACTIVE") return false;
      if (selectedStatus === "CONFIG_REQUIRED" && svc.lifecycleStatus !== "CONFIGURATION_REQUIRED") return false;
      if (selectedStatus === "AVAILABLE" && svc.lifecycleStatus !== "AVAILABLE") return false;
      if (selectedStatus === "PLANNED" && svc.lifecycleStatus !== "PLANNED") return false;

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = svc.name.toLowerCase().includes(q);
        const matchDesc = svc.description.toLowerCase().includes(q);
        const matchCat = svc.category.toLowerCase().includes(q);
        const matchBadge = svc.badge?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat && !matchBadge) {
          return false;
        }
      }
      return true;
    });
  }, [data?.services, selectedCategory, selectedStatus, search]);

  // Counts for pills
  const counts = useMemo(() => {
    if (!data?.services) return { all: 0, active: 0, config: 0, available: 0, planned: 0 };
    return {
      all: data.services.length,
      active: data.services.filter((s) => s.lifecycleStatus === "ACTIVE").length,
      config: data.services.filter((s) => s.lifecycleStatus === "CONFIGURATION_REQUIRED").length,
      available: data.services.filter((s) => s.lifecycleStatus === "AVAILABLE").length,
      planned: data.services.filter((s) => s.lifecycleStatus === "PLANNED").length,
    };
  }, [data?.services]);

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5EE] text-[#16845B] border border-[#E5EBE7] mb-2">
            <Plug className="h-3.5 w-3.5 text-[#16845B]" />
            <span>Centralized Restaurant Module Activation Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#172B25]">
            RestroNex Marketplace &amp; Add-on Hub
          </h1>
          <p className="text-sm text-[#718078] mt-1">
            Activate POS extensions, automated marketing, hardware drivers, and analytics modules in real time.
          </p>
        </div>

        {data && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl bg-white border border-[#E5EBE7] p-3 shadow-2xs text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                Subscription Tier
              </div>
              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                <span className="text-sm font-black text-[#172B25]">{data.planName}</span>
                <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-2 py-0.5 text-[10px] font-bold text-[#16845B]">
                  {data.planTier}
                </span>
              </div>
              <div className="text-[11px] text-[#718078] mt-0.5">
                {data.planTier === "SCALE"
                  ? "All 40+ modules included"
                  : data.planTier === "GROWTH"
                  ? `${data.activeAddonsCount} of ${data.allowedAddonsLimit} add-ons active`
                  : "Base POS • Upgrade for add-ons"}
              </div>
            </div>

            <Link
              href="/app/subscription"
              className="rounded-xl border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] px-4 py-2 text-xs font-bold text-[#16845B] shadow-2xs transition"
            >
              Manage Plan →
            </Link>
          </div>
        )}
      </div>

      {/* Alert / Notification Feedback */}
      {feedback && (
        <div
          className={`rounded-xl p-4 text-xs font-semibold flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="hover:opacity-75 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Category Filter Controls */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718078]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services by name, category, or capability (e.g. KDS, Loyalty, Thermal, UPI, QR Menus)..."
                className="pl-10 bg-[#F8FAF9] border-[#E5EBE7] text-sm text-[#172B25] rounded-xl focus:bg-white"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {[
                { id: "ALL", label: "All Categories" },
                { id: "crm", label: "CRM & Loyalty" },
                { id: "analytics", label: "Analytics" },
                { id: "service", label: "Service & KDS" },
                { id: "operations", label: "Operations" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    selectedCategory === c.id
                      ? "bg-[#16845B] text-white shadow-xs"
                      : "bg-[#F8FAF9] text-[#718078] hover:bg-[#E8F5EE] hover:text-[#172B25] border border-[#E5EBE7]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E5EBE7]">
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => setSelectedStatus("ALL")}
                className={`font-semibold px-2.5 py-1 rounded-md transition ${
                  selectedStatus === "ALL"
                    ? "bg-[#E8F5EE] text-[#16845B]"
                    : "text-[#718078] hover:text-[#172B25]"
                }`}
              >
                All ({counts.all})
              </button>
              <button
                onClick={() => setSelectedStatus("ACTIVE")}
                className={`font-semibold px-2.5 py-1 rounded-md transition ${
                  selectedStatus === "ACTIVE"
                    ? "bg-[#E8F5EE] text-[#16845B]"
                    : "text-[#718078] hover:text-[#172B25]"
                }`}
              >
                Active ({counts.active})
              </button>
              <button
                onClick={() => setSelectedStatus("CONFIG_REQUIRED")}
                className={`font-semibold px-2.5 py-1 rounded-md transition ${
                  selectedStatus === "CONFIG_REQUIRED"
                    ? "bg-amber-100 text-amber-900"
                    : "text-[#718078] hover:text-[#172B25]"
                }`}
              >
                Requires Setup ({counts.config})
              </button>
              <button
                onClick={() => setSelectedStatus("AVAILABLE")}
                className={`font-semibold px-2.5 py-1 rounded-md transition ${
                  selectedStatus === "AVAILABLE"
                    ? "bg-[#E8F5EE] text-[#16845B]"
                    : "text-[#718078] hover:text-[#172B25]"
                }`}
              >
                Available to Add ({counts.available})
              </button>
              <button
                onClick={() => setSelectedStatus("PLANNED")}
                className={`font-semibold px-2.5 py-1 rounded-md transition ${
                  selectedStatus === "PLANNED"
                    ? "bg-slate-100 text-slate-800"
                    : "text-[#718078] hover:text-[#172B25]"
                }`}
              >
                Roadmap / Planned ({counts.planned})
              </button>
            </div>

            <button
              onClick={loadCatalog}
              title="Refresh Catalog"
              className="p-1.5 rounded-lg border border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      {loading && !data ? (
        <div className="py-24 text-center text-sm text-[#718078] border border-dashed border-[#E5EBE7] rounded-2xl bg-white">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#16845B] mb-2" />
          Loading verified marketplace services...
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="py-20 text-center text-sm text-[#718078] border border-dashed border-[#E5EBE7] rounded-2xl bg-white">
          No services matching your search criteria. Try adjusting the category or search keywords.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((svc) => {
            const IconComponent = ICON_MAP[svc.iconName] || Plug;
            const isActivating = activatingId === svc.id;
            const isDeactivating = deactivatingId === svc.id;

            return (
              <div
                key={svc.id}
                className={`rounded-2xl border bg-white p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition relative ${
                  svc.lifecycleStatus === "ACTIVE"
                    ? "border-[#16845B]/30 ring-1 ring-[#16845B]/10"
                    : svc.lifecycleStatus === "CONFIGURATION_REQUIRED"
                    ? "border-amber-300"
                    : svc.lifecycleStatus === "PLANNED"
                    ? "border-dashed border-slate-300 bg-slate-50/40"
                    : "border-[#E5EBE7]"
                }`}
              >
                <div>
                  {/* Top Bar: Icon, Category & Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        svc.lifecycleStatus === "ACTIVE"
                          ? "bg-[#E8F5EE] border-[#16845B]/20 text-[#16845B]"
                          : svc.lifecycleStatus === "CONFIGURATION_REQUIRED"
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : svc.lifecycleStatus === "PLANNED"
                          ? "bg-slate-100 border-slate-200 text-slate-500"
                          : "bg-[#F8FAF9] border-[#E5EBE7] text-[#172B25]"
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {svc.lifecycleStatus === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5EE] border border-[#16845B]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#16845B]">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>ACTIVE</span>
                        </span>
                      ) : svc.lifecycleStatus === "CONFIGURATION_REQUIRED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          <Settings className="h-3 w-3" />
                          <span>SETUP REQUIRED</span>
                        </span>
                      ) : svc.lifecycleStatus === "PLANNED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                          <span>ROADMAP</span>
                        </span>
                      ) : svc.isRestricted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-[10px] font-bold text-red-700">
                          <Lock className="h-3 w-3" />
                          <span>{svc.requiredPlanTier} PLAN</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAF9] border border-[#E5EBE7] px-2.5 py-0.5 text-[10px] font-semibold text-[#718078]">
                          AVAILABLE
                        </span>
                      )}

                      {svc.badge && (
                        <span className="text-[10px] font-semibold text-[#718078]">
                          {svc.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-[#172B25] tracking-tight">{svc.name}</h3>
                  <p className="text-xs text-[#718078] mt-1.5 leading-relaxed line-clamp-3">
                    {svc.description}
                  </p>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 mt-4 border-t border-[#E5EBE7] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                    {svc.category}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Active State Actions */}
                    {svc.lifecycleStatus === "ACTIVE" && (
                      <>
                        {!svc.isCoreDefault && (
                          <button
                            onClick={() => handleDeactivate(svc.id)}
                            disabled={isDeactivating}
                            title="Deactivate Add-on"
                            className="p-2 rounded-xl text-[#718078] hover:text-red-600 hover:bg-red-50 transition border border-[#E5EBE7]"
                          >
                            <PowerOff className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {svc.targetRoute && (
                          <Link
                            href={svc.targetRoute}
                            className="rounded-xl bg-[#16845B] hover:bg-[#116B49] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition flex items-center gap-1"
                          >
                            <span>Open</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </>
                    )}

                    {/* Setup Required State Actions */}
                    {svc.lifecycleStatus === "CONFIGURATION_REQUIRED" && (
                      <Link
                        href={svc.configRoute || svc.targetRoute || "/app/settings"}
                        className="rounded-xl bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs transition flex items-center gap-1"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        <span>Setup →</span>
                      </Link>
                    )}

                    {/* Available State Action */}
                    {svc.lifecycleStatus === "AVAILABLE" && (
                      <button
                        onClick={() => handleActivate(svc.id)}
                        disabled={isActivating}
                        className="rounded-xl bg-white hover:bg-[#E8F5EE] hover:text-[#16845B] border border-[#E5EBE7] px-4 py-1.5 text-xs font-bold text-[#172B25] shadow-2xs transition disabled:opacity-50 flex items-center gap-1"
                      >
                        {isActivating ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <span>+ Add</span>
                        )}
                      </button>
                    )}

                    {/* Restricted State Action */}
                    {svc.lifecycleStatus === "RESTRICTED" && (
                      <Link
                        href="/app/subscription"
                        className="rounded-xl bg-[#F8FAF9] hover:bg-[#E8F5EE] border border-[#E5EBE7] px-3 py-1.5 text-xs font-semibold text-[#16845B] transition flex items-center gap-1"
                      >
                        <Lock className="h-3 w-3" />
                        <span>Upgrade</span>
                      </Link>
                    )}

                    {/* Planned State Action */}
                    {svc.lifecycleStatus === "PLANNED" && (
                      <button
                        onClick={() =>
                          alert(`Thank you for your interest in ${svc.name}! Our engineering team has logged your interest for early beta access.`)
                        }
                        className="rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition"
                      >
                        Notify Me
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Callout */}
      <Card className="bg-white border-[#E5EBE7]">
        <CardContent className="pt-5 pb-5 text-xs text-[#718078] leading-relaxed flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <strong className="text-[#172B25]">RestroNex Module Entitlement Policy:</strong> Core POS, floor tables, day-end reconciliation, and basic reporting are active by default on all plans. Growth tier grants any 5 advanced add-ons free. Scale tier unlocks all 40+ POS add-ons with zero individual connector fees.
          </div>
          <Link
            href="/app/subscription"
            className="rounded-full bg-[#E8F5EE] text-[#16845B] border border-[#E5EBE7] px-4 py-1.5 font-bold hover:bg-[#16845B] hover:text-white transition whitespace-nowrap"
          >
            Review Subscription Plan →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
