"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Store,
  Building2,
  CheckCircle2,
  Ban,
  Search,
  Filter,
  Users,
  Calendar,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

export default function TenantsAdminClient({ initialTenants }: { initialTenants: any[] }) {
  const [tenants, setTenants] = useState(initialTenants);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Filtered tenants
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    const sub = t.subscriptions?.[0];
    const matchesPlan = planFilter === "ALL" || sub?.plan?.slug === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  async function handleSuspendOrReactivate(tenant: any) {
    const isSuspending = tenant.status === "ACTIVE";
    const promptText = isSuspending
      ? `Reason for suspending organization "${tenant.name}"? (Required for audit log)`
      : `Reason for reactivating organization "${tenant.name}"?`;

    const reason = window.prompt(promptText, isSuspending ? "Terms of Service compliance review" : "Account resolved");
    if (reason === null) return; // User cancelled prompt

    setBusyId(tenant.id);
    setMsg(null);
    try {
      const res = await fetch("/api/platform/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isSuspending ? "SUSPEND_TENANT" : "REACTIVATE_TENANT",
          tenantId: tenant.id,
          reason: reason.trim() || "Administrative action",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to update organization");

      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, status: j.tenant.status } : t))
      );
      setMsg(`✓ Organization "${tenant.name}" status updated to ${j.tenant.status} (audit logged).`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleOutletStatus(tenantId: string, outlet: any) {
    const nextStatus = outlet.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBusyId(outlet.id);
    setMsg(null);
    try {
      const res = await fetch("/api/platform/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_OUTLET",
          outletId: outlet.id,
          status: nextStatus,
          reason: "Platform admin manual outlet toggle",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to update outlet");
      setTenants((prev) =>
        prev.map((t) =>
          t.id === tenantId
            ? {
                ...t,
                outlets: t.outlets.map((o: any) =>
                  o.id === outlet.id ? { ...o, status: j.outlet.status } : o
                ),
              }
            : t
        )
      );
      setMsg(`✓ Outlet "${outlet.name}" status updated to ${nextStatus} (audit logged).`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#172B25]">Organization &amp; Tenant Directory</h1>
          <p className="text-sm text-[#718078]">
            Directory of restaurant tenant accounts with multi-branch inspection and safe lifecycle controls.
          </p>
        </div>
        {msg && (
          <span className="text-xs font-bold text-[#16845B] bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1.5 rounded-full">
            {msg}
          </span>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718078]" />
          <input
            type="text"
            placeholder="Search by business name, email, slug, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] text-xs font-medium text-[#172B25] placeholder:text-[#718078] focus:outline-hidden focus:border-[#16845B] focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-[#F8FAF9] border border-[#E5EBE7] px-3 py-1.5 rounded-xl">
            <span className="text-[#718078] font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-[#172B25] focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F8FAF9] border border-[#E5EBE7] px-3 py-1.5 rounded-xl">
            <span className="text-[#718078] font-semibold">Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-transparent font-bold text-[#172B25] focus:outline-hidden"
            >
              <option value="ALL">All Plans</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="business">Business</option>
            </select>
          </div>

          <div className="text-[#718078] font-semibold px-2">
            Showing {filteredTenants.length} of {tenants.length}
          </div>
        </div>
      </div>

      {/* Organization Cards */}
      <div className="grid gap-4">
        {filteredTenants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5EBE7] bg-white p-8 text-center text-xs text-[#718078]">
            No organizations match the selected search or filter criteria.
          </div>
        ) : (
          filteredTenants.map((t) => {
            const activeSub = t.subscriptions?.[0];
            const isSuspended = t.status === "SUSPENDED";

            return (
              <Card key={t.id} className="bg-white border-[#E5EBE7] shadow-xs">
                <CardContent className="pt-5 pb-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5EBE7] pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#16845B]" />
                        <h2 className="text-base font-black text-[#172B25]">{t.name}</h2>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isSuspended
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : "bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#718078]">
                        <span>ID: <code className="text-[#172B25] font-mono text-[11px]">{t.id}</code></span>
                        <span>•</span>
                        <span>Slug: <code className="text-[#172B25] font-mono text-[11px]">{t.slug}</code></span>
                        <span>•</span>
                        <span>Owner Email: <span className="font-semibold text-[#172B25]">{t.email}</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={isSuspended ? "default" : "outline"}
                        className={`text-xs font-bold rounded-xl ${
                          isSuspended
                            ? "bg-[#16845B] text-white hover:bg-[#116B49]"
                            : "border-red-200 text-red-700 hover:bg-red-50"
                        }`}
                        disabled={busyId === t.id}
                        onClick={() => handleSuspendOrReactivate(t)}
                      >
                        {busyId === t.id ? (
                          "Updating..."
                        ) : isSuspended ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Reactivate Business
                          </>
                        ) : (
                          <>
                            <Ban className="h-3.5 w-3.5 mr-1" />
                            Suspend Business
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#F8FAF9] p-3 rounded-xl border border-[#E5EBE7]">
                    <div>
                      <span className="text-[#718078] block">Subscription Plan</span>
                      <span className="font-bold text-[#172B25]">
                        {activeSub?.plan?.name || "No Plan"} ({activeSub?.status || "PENDING"})
                      </span>
                    </div>
                    <div>
                      <span className="text-[#718078] block">Active Outlets</span>
                      <span className="font-bold text-[#172B25]">
                        {t.outlets?.filter((o: any) => o.status === "ACTIVE").length || 0} of {t.outlets?.length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#718078] block">Staff Members</span>
                      <span className="font-bold text-[#172B25]">
                        {t._count?.memberships || t.memberships?.length || 0} Users
                      </span>
                    </div>
                    <div>
                      <span className="text-[#718078] block">Registered On</span>
                      <span className="font-bold text-[#172B25]">
                        {new Date(t.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Outlets Directory for this Organization */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#718078]">
                      Outlets ({t.outlets?.length || 0})
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {t.outlets?.map((o: any) => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-[#E5EBE7] bg-white text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-[#16845B]" />
                            <div>
                              <div className="font-bold text-[#172B25]">{o.name}</div>
                              <div className="text-[11px] text-[#718078]">{o.city || "No City"}</div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-[#718078] hover:text-[#172B25]"
                            disabled={busyId === o.id}
                            onClick={() => toggleOutletStatus(t.id, o)}
                          >
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                o.status === "ACTIVE"
                                  ? "bg-[#E8F5EE] text-[#16845B]"
                                  : "bg-[#F8FAF9] text-[#718078] border border-[#E5EBE7]"
                              }`}
                            >
                              {o.status}
                            </span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
