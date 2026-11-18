"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Building2, Search, MapPin, Users, UtensilsCrossed } from "lucide-react";

export default function OutletsAdminClient({ initialOutlets }: { initialOutlets: any[] }) {
  const [outlets, setOutlets] = useState(initialOutlets);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredOutlets = outlets.filter((o) => {
    const matchesSearch =
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function toggleStatus(outlet: any) {
    const nextStatus = outlet.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBusyId(outlet.id);
    try {
      const res = await fetch("/api/platform/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_OUTLET",
          outletId: outlet.id,
          status: nextStatus,
          reason: "Platform admin manual toggle",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to update outlet");
      setOutlets((prev) =>
        prev.map((item) => (item.id === outlet.id ? { ...item, status: j.outlet.status } : item))
      );
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
          <h1 className="text-2xl font-black text-[#172B25]">Global Outlets Directory</h1>
          <p className="text-sm text-[#718078]">
            Directory of all restaurant branches, seating capacities, and operational statuses across the platform.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718078]" />
          <input
            type="text"
            placeholder="Search by branch name, organization, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] text-xs font-medium text-[#172B25] placeholder:text-[#718078] focus:outline-hidden focus:border-[#16845B] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-[#F8FAF9] border border-[#E5EBE7] px-3 py-1.5 rounded-xl">
            <span className="text-[#718078] font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold text-[#172B25] focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="text-[#718078] font-semibold px-2">
            Showing {filteredOutlets.length} of {outlets.length}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredOutlets.map((o) => (
          <Card key={o.id} className="bg-white border-[#E5EBE7] shadow-xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-[#E8F5EE] p-2 text-[#16845B]">
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#172B25]">{o.name}</h3>
                    <div className="text-[11px] text-[#718078] flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span>{o.tenant.name}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleStatus(o)}
                  disabled={busyId === o.id}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                    o.status === "ACTIVE"
                      ? "bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20"
                      : "bg-[#F8FAF9] text-[#718078] border border-[#E5EBE7]"
                  }`}
                >
                  {o.status}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs bg-[#F8FAF9] p-2.5 rounded-xl border border-[#E5EBE7]">
                <div>
                  <span className="text-[#718078] block text-[10px]">Tables</span>
                  <span className="font-bold text-[#172B25]">{o._count?.tables || 0}</span>
                </div>
                <div>
                  <span className="text-[#718078] block text-[10px]">Staff</span>
                  <span className="font-bold text-[#172B25]">{o._count?.memberships || 0}</span>
                </div>
                <div>
                  <span className="text-[#718078] block text-[10px]">Total Orders</span>
                  <span className="font-bold text-[#172B25]">{o._count?.orders || 0}</span>
                </div>
              </div>

              <div className="text-[11px] text-[#718078] flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{o.city || "Unspecified City"}</span>
                </span>
                <span>Plan: <strong className="text-[#172B25]">{o.tenant.subscriptions?.[0]?.plan?.name || "None"}</strong></span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
