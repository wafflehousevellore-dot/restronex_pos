"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  X,
  Building2,
  ChefHat,
  CreditCard,
  Utensils,
  Boxes,
  Crown,
  Search,
} from "lucide-react";

type StaffMember = {
  id: string;
  role: string;
  outletId?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role: string;
    createdAt: string;
  };
  outlet?: {
    id: string;
    name: string;
  } | null;
};

type Outlet = {
  id: string;
  name: string;
};

const ROLES_INFO: Record<string, { label: string; desc: string; icon: any; color: string }> = {
  OWNER: {
    label: "Owner",
    desc: "Full administrative access across all outlets, billing, financial reports, and settings.",
    icon: Crown,
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  HEAD_OFFICE: {
    label: "Head Office",
    desc: "Central menu management, pricing, cross-outlet reports, and operations oversight.",
    icon: Shield,
    color: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  OUTLET_MANAGER: {
    label: "Outlet Manager",
    desc: "Manage day-to-day operations, cash shifts, staff attendance, and local outlet menu.",
    icon: Building2,
    color: "bg-blue-50 text-blue-800 border-blue-200",
  },
  CASHIER: {
    label: "Cashier",
    desc: "POS register billing, customer payment collection, bill settlement, and thermal receipts.",
    icon: CreditCard,
    color: "bg-amber-50 text-amber-800 border-amber-200",
  },
  WAITER: {
    label: "Floor Waiter",
    desc: "Tableside order taking, table assignment, sending KOT to kitchen, and guest assistance.",
    icon: Utensils,
    color: "bg-teal-50 text-teal-800 border-teal-200",
  },
  KITCHEN: {
    label: "Kitchen Chef",
    desc: "KDS screen access, prep status updates, station routing, and ticket bump workflows.",
    icon: ChefHat,
    color: "bg-rose-50 text-rose-800 border-rose-200",
  },
  INVENTORY: {
    label: "Inventory Clerk",
    desc: "Stock tracking, raw ingredients receipt, supplier purchase orders, and waste logging.",
    icon: Boxes,
    color: "bg-purple-50 text-purple-800 border-purple-200",
  },
};

export default function StaffPage() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("OWNER");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Invite Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("CASHIER");
  const [formOutletId, setFormOutletId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const res = await apiFetch("/api/staff");
      if (res.ok) {
        const j = await res.json();
        setMembers(j.memberships || []);
        setOutlets(j.outlets || []);
        if (j.currentRole) setCurrentRole(j.currentRole);
      }
    } catch {
      setMsg({ type: "error", text: "Failed to load staff team" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setMsg({ type: "error", text: "Please enter staff name and email" });
      return;
    }

    setSubmitting(true);
    setMsg(null);
    try {
      const res = await apiFetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          role: formRole,
          outletId: formOutletId || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: j.error || "Failed to add staff member" });
      } else {
        setMsg({ type: "success", text: `${formName} added successfully to team` });
        setIsModalOpen(false);
        setFormName("");
        setFormEmail("");
        setFormRole("CASHIER");
        setFormOutletId("");
        loadStaff();
      }
    } catch {
      setMsg({ type: "error", text: "An error occurred adding staff member" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRole(membershipId: string, role: string) {
    try {
      const res = await apiFetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, role }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: "Staff role updated" });
        loadStaff();
      } else {
        const j = await res.json();
        setMsg({ type: "error", text: j.error || "Failed to update role" });
      }
    } catch {
      setMsg({ type: "error", text: "Update failed" });
    }
  }

  async function handleUpdateOutlet(membershipId: string, outletId: string) {
    try {
      const res = await apiFetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, outletId: outletId || null }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: "Staff outlet assignment updated" });
        loadStaff();
      } else {
        const j = await res.json();
        setMsg({ type: "error", text: j.error || "Failed to update outlet" });
      }
    } catch {
      setMsg({ type: "error", text: "Update failed" });
    }
  }

  async function handleRemoveMember(membershipId: string, name: string) {
    if (!confirm(`Are you sure you want to remove ${name} from this restaurant?`)) return;
    try {
      const res = await apiFetch(`/api/staff?membershipId=${membershipId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMsg({ type: "success", text: `${name} has been removed` });
        loadStaff();
      } else {
        const j = await res.json();
        setMsg({ type: "error", text: j.error || "Failed to remove staff" });
      }
    } catch {
      setMsg({ type: "error", text: "Remove failed" });
    }
  }

  const isOwnerOrHeadOffice = currentRole === "OWNER" || currentRole === "HEAD_OFFICE";

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      !search ||
      m.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.user?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Staff & Team Access Control</h1>
          <p className="text-sm text-[#718078]">
            Manage cashiers, floor waiters, chefs, and outlet managers with granular role-based permissions.
          </p>
        </div>

        {isOwnerOrHeadOffice && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-5 py-2.5 text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Add Staff Member
          </Button>
        )}
      </div>

      {/* Notifications */}
      {msg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
            msg.type === "success"
              ? "bg-[#E8F5EE] text-[#16845B] border-[#16845B]/30"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="p-1 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#E5EBE7] p-3 rounded-2xl shadow-2xs">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#718078]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by staff name or email..."
            className="pl-9 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl text-[#172B25]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-[#718078] uppercase px-1">Role:</span>
          {["ALL", "OWNER", "OUTLET_MANAGER", "CASHIER", "WAITER", "KITCHEN", "INVENTORY"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-full px-3 py-1 text-xs font-bold border transition cursor-pointer ${
                roleFilter === r
                  ? "bg-[#16845B] text-white border-[#16845B] shadow-2xs"
                  : "bg-white border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
              }`}
            >
              {r === "ALL" ? "All" : ROLES_INFO[r]?.label || r}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Members List */}
      <Card className="bg-white border-[#E5EBE7] shadow-sm">
        <CardHeader className="pb-3 border-b border-[#E5EBE7]">
          <CardTitle className="text-base text-[#172B25] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#16845B]" />
              Active Team Members ({filteredMembers.length})
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-[#E5EBE7]">
          {loading ? (
            <div className="py-12 text-center text-xs text-[#718078]">Loading staff team...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#718078]">
              No staff members matching your filter. Click <b>Add Staff Member</b> above to invite your team.
            </div>
          ) : (
            filteredMembers.map((m) => {
              const roleMeta = ROLES_INFO[m.role] || ROLES_INFO.CASHIER;
              const RoleIcon = roleMeta.icon;

              return (
                <div
                  key={m.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAF9]/60 transition"
                >
                  {/* Staff Info */}
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 flex items-center justify-center text-xs font-black text-[#16845B] shrink-0">
                      {m.user?.name?.slice(0, 2).toUpperCase() || "ST"}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#172B25] flex items-center gap-2">
                        <span>{m.user?.name}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase flex items-center gap-1 ${roleMeta.color}`}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {roleMeta.label}
                        </span>
                      </div>
                      <div className="text-xs text-[#718078] mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{m.user?.email}</span>
                        <span>•</span>
                        <span>{m.outlet ? m.outlet.name : "All Outlets (Global)"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Role Selectors */}
                  {isOwnerOrHeadOffice && m.role !== "OWNER" && (
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Outlet Assignment Dropdown */}
                      <select
                        value={m.outletId || ""}
                        onChange={(e) => handleUpdateOutlet(m.id, e.target.value)}
                        className="rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1.5 text-xs text-[#172B25] font-medium shadow-2xs focus:border-[#16845B] focus:outline-none"
                      >
                        <option value="">All Outlets</option>
                        {outlets.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>

                      {/* Role Selector */}
                      <select
                        value={m.role}
                        onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                        className="rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1.5 text-xs text-[#172B25] font-medium shadow-2xs focus:border-[#16845B] focus:outline-none"
                      >
                        {Object.entries(ROLES_INFO)
                          .filter(([k]) => k !== "OWNER")
                          .map(([key, info]) => (
                            <option key={key} value={key}>
                              {info.label}
                            </option>
                          ))}
                      </select>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveMember(m.id, m.user.name)}
                        className="p-1.5 rounded-lg border border-[#E5EBE7] bg-white text-[#718078] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition shadow-2xs"
                        title="Remove Staff"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Role Permission Matrix Guide */}
      <div className="space-y-3">
        <h2 className="text-base font-black text-[#172B25]">Role-Based Access Control (RBAC) Matrix</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(ROLES_INFO).map(([key, info]) => {
            const Icon = info.icon;
            return (
              <Card key={key} className="bg-white border-[#E5EBE7] shadow-xs">
                <CardContent className="p-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg border ${info.color}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-black text-[#172B25] uppercase tracking-wide">
                      {info.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#718078] leading-relaxed pt-1">
                    {info.desc}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-[#E5EBE7]">
            <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3">
              <h3 className="font-extrabold text-base text-[#172B25] flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#16845B]" />
                Add Staff Member
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-7 w-7 rounded-full bg-[#F8FAF9] text-[#718078] grid place-items-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-3.5">
              <div>
                <Label className="text-xs font-bold text-[#172B25]">Full Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Email Address *</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="rahul@restaurant.com"
                  required
                  className="mt-1 bg-[#F8FAF9] border-[#E5EBE7] text-xs h-9 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Staff Role *</Label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3 py-2 text-xs text-[#172B25] font-semibold focus:border-[#16845B] focus:outline-none"
                >
                  {Object.entries(ROLES_INFO)
                    .filter(([k]) => k !== "OWNER")
                    .map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.label} — {info.desc.slice(0, 40)}...
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-[#172B25]">Assigned Outlet</Label>
                <select
                  value={formOutletId}
                  onChange={(e) => setFormOutletId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3 py-2 text-xs text-[#172B25] font-semibold focus:border-[#16845B] focus:outline-none"
                >
                  <option value="">All Outlets (Global)</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-full border-[#E5EBE7] text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {submitting ? "Adding..." : "Add Staff Member"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
