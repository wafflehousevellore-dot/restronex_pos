"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, Building2, CheckCircle2, Ban } from "lucide-react";

export default function TenantsAdminClient({ initialTenants }: { initialTenants: any[] }) {
  const [tenants, setTenants] = useState(initialTenants);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function toggleTenantStatus(tenant: any) {
    const nextStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setBusyId(tenant.id);
    setMsg(null);
    try {
      const res = await fetch("/api/platform/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_TENANT",
          tenantId: tenant.id,
          status: nextStatus,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to update organization");
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, status: j.tenant.status } : t))
      );
      setMsg(`✓ Organization "${tenant.name}" status updated to ${nextStatus} (audit logged).`);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#172B25]">Organizations &amp; Outlets Management</h1>
          <p className="text-sm text-[#718078]">
            Manage restaurant organizations, outlet operational statuses, and active subscriptions.
          </p>
        </div>
        {msg && (
          <span className="text-xs font-bold text-[#16845B] bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1.5 rounded-full">
            {msg}
          </span>
        )}
      </div>

      <div className="grid gap-4">
        {tenants.map((t) => {
          const activeSub = t.subscriptions?.[0];
          return (
            <Card key={t.id} className="bg-white border-[#E5EBE7] shadow-xs">
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-[#172B25] text-base flex items-center gap-2 flex-wrap">
                      <Building2 className="h-4 w-4 text-[#16845B]" />
                      <span>{t.name}</span>
                      <Badge
                        variant="secondary"
                        className={
                          t.status === "ACTIVE"
                            ? "bg-[#E8F5EE] text-[#16845B] border-[#E5EBE7]"
                            : "bg-red-50 text-red-700 border-red-200"
                        }
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-[#718078] mt-1">
                      {t.businessType} • {t.email} • {t.phone} • {t._count?.orders ?? 0} orders •{" "}
                      {t._count?.memberships ?? 0} team members
                    </div>
                    <div className="text-[11px] text-[#718078] mt-0.5 font-mono">
                      {t.slug} • {t.country} • {t.timeZone}
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end gap-2">
                    <div className="text-xs font-bold text-[#16845B]">
                      {activeSub?.plan?.name || "No plan"} • {activeSub?.status || "UNSUBSCRIBED"}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === t.id}
                      onClick={() => toggleTenantStatus(t)}
                      className={`rounded-full text-xs h-8 px-3.5 cursor-pointer ${
                        t.status === "ACTIVE"
                          ? "border-red-200 text-red-700 hover:bg-red-50"
                          : "border-[#16845B]/30 text-[#16845B] hover:bg-[#E8F5EE]"
                      }`}
                    >
                      {t.status === "ACTIVE" ? (
                        <>
                          <Ban className="h-3 w-3 mr-1" /> Suspend Org
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Activate Org
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Outlets List */}
                <div className="border-t border-[#E5EBE7] pt-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078] mb-2">
                    Outlets ({t.outlets?.length || 0})
                  </div>
                  {t.outlets?.length ? (
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {t.outlets.map((o: any) => (
                        <div
                          key={o.id}
                          className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-[#172B25] flex items-center gap-1.5 truncate">
                              <Store className="h-3.5 w-3.5 text-[#16845B] shrink-0" />
                              <span className="truncate">{o.name}</span>
                            </div>
                            <div className="text-[11px] text-[#718078] truncate">
                              {o.city} • {o.phone}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={busyId === o.id}
                            onClick={() => toggleOutletStatus(t.id, o)}
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold border cursor-pointer ${
                              o.status === "ACTIVE"
                                ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
                                : "bg-red-50 border-red-200 text-red-700"
                            }`}
                          >
                            {o.status}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[#718078]">No outlets registered yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {tenants.length === 0 && (
          <Card className="p-8 text-center bg-white border-[#E5EBE7]">
            <CardContent className="text-sm text-[#718078]">
              No tenants yet — create via onboarding or registration.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
