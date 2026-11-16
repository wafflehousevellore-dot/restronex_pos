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
  ChefHat,
  CreditCard,
  Utensils,
  Boxes,
  Crown,
  Search,
  Mail,
  Copy,
  Check,
  Ban,
  CheckCircle,
  Lock,
  Share2,
  Send,
} from "lucide-react";

type StaffMember = {
  id: string;
  role: string;
  status: string;
  outletId?: string | null;
  permissionsJson?: string | null;
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
  outletMembers?: {
    outlet: { id: string; name: string };
  }[];
};

type PendingInvitation = {
  id: string;
  email: string;
  fullName?: string | null;
  role: string;
  rawToken?: string | null;
  expiresAt: string;
  createdAt: string;
  outlet?: { id: string; name: string } | null;
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
  MANAGER: {
    label: "Manager",
    desc: "Operations oversight, order monitoring, staff coordination, and floor management.",
    icon: Shield,
    color: "bg-indigo-50 text-indigo-800 border-indigo-200",
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
  KITCHEN_STAFF: {
    label: "Kitchen Chef",
    desc: "KDS screen access, prep status updates, station routing, and ticket bump workflows.",
    icon: ChefHat,
    color: "bg-rose-50 text-rose-800 border-rose-200",
  },
  INVENTORY_MANAGER: {
    label: "Inventory Manager",
    desc: "Stock tracking, raw ingredients receipt, supplier purchase orders, and waste logging.",
    icon: Boxes,
    color: "bg-purple-50 text-purple-800 border-purple-200",
  },
  ACCOUNTANT: {
    label: "Accountant",
    desc: "Authorized billing history, financial reconciliations, tax reports, and sales insights.",
    icon: CreditCard,
    color: "bg-sky-50 text-sky-800 border-sky-200",
  },
};

export default function StaffPage() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [currentRole, setCurrentRole] = useState<string>("OWNER");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [copiedLink, setCopiedLink] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Newly Created Invite Modal State
  const [createdInvite, setCreatedInvite] = useState<{
    email: string;
    role: string;
    url: string;
    emailSent: boolean;
  } | null>(null);
  const [copiedCreatedLink, setCopiedCreatedLink] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Invite Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("CASHIER");
  const [formOutletId, setFormOutletId] = useState("");
  const [formOutletIds, setFormOutletIds] = useState<string[]>([]);
  const [sendInvitationMode, setSendInvitationMode] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const res = await apiFetch("/api/staff");
      if (res.ok) {
        const j = await res.json();
        setMembers(j.memberships || []);
        setPendingInvitations(j.pendingInvitations || []);
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
    if (!formEmail.trim()) {
      setMsg({ type: "error", text: "Please enter staff email" });
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
          outletIds: formOutletIds,
          sendInvitation: sendInvitationMode,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg({ type: "error", text: j.error || "Failed to add staff member" });
      } else {
        if (j.inviteUrl) {
          setCreatedInvite({
            email: formEmail.trim(),
            role: formRole,
            url: j.inviteUrl,
            emailSent: !!j.emailSent,
          });
        }
        setMsg({
          type: "success",
          text: sendInvitationMode
            ? (j.emailSent
                ? `Invitation email dispatched to ${formEmail}. You can also copy the direct link below.`
                : `Invitation created for ${formEmail}. Copy the single-use invite link below.`)
            : `${formName || formEmail} added successfully to team.`,
        });
        setIsModalOpen(false);
        setFormName("");
        setFormEmail("");
        setFormRole("CASHIER");
        setFormOutletId("");
        setFormOutletIds([]);
        loadStaff();
      }
    } catch {
      setMsg({ type: "error", text: "An error occurred adding staff member" });
    } finally {
      setSubmitting(false);
    }
  }

  function copyInviteLink(rawToken: string, id: string) {
    const url = `https://www.restronexpos.com/staff/accept-invitation?token=${rawToken}`;
    navigator.clipboard.writeText(url);
    setCopiedInviteId(id);
    setTimeout(() => setCopiedInviteId(null), 2500);
  }

  async function handleResendInvitation(id: string, email: string) {
    setResendingId(id);
    try {
      const res = await apiFetch("/api/staff/invitations?action=resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (res.ok) {
        setMsg({
          type: "success",
          text: j.emailSent
            ? `Invitation email successfully resent to ${email}`
            : `Invitation link refreshed for ${email}`,
        });
        loadStaff();
      } else {
        setMsg({ type: "error", text: j.error || "Failed to resend invitation" });
      }
    } catch {
      setMsg({ type: "error", text: "Error resending invitation" });
    } finally {
      setResendingId(null);
    }
  }

  async function handleToggleStatus(membershipId: string, currentStatus: string, name: string) {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const actionLabel = newStatus === "SUSPENDED" ? "suspend" : "reactivate";

    if (!confirm(`Are you sure you want to ${actionLabel} ${name}'s staff access?`)) return;

    try {
      const res = await apiFetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, status: newStatus }),
      });
      if (res.ok) {
        setMsg({ type: "success", text: `${name} has been ${newStatus.toLowerCase()}` });
        loadStaff();
      } else {
        const j = await res.json();
        setMsg({ type: "error", text: j.error || `Failed to ${actionLabel} staff` });
      }
    } catch {
      setMsg({ type: "error", text: "Status update failed" });
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

  async function handleRevokeInvitation(id: string, email: string) {
    if (!confirm(`Are you sure you want to revoke the pending invitation for ${email}?`)) return;
    try {
      const res = await apiFetch(`/api/staff/invitations?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMsg({ type: "success", text: `Invitation for ${email} has been revoked` });
        loadStaff();
      } else {
        const j = await res.json();
        setMsg({ type: "error", text: j.error || "Failed to revoke invitation" });
      }
    } catch {
      setMsg({ type: "error", text: "Revoke failed" });
    }
  }

  async function handleRemoveMember(membershipId: string, name: string) {
    if (!confirm(`Are you sure you want to permanently remove ${name} from this restaurant?`)) return;
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

  function copyStaffLoginUrl() {
    navigator.clipboard.writeText("https://www.restronexpos.com/staff/login");
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
            Invite Staff Member
          </Button>
        )}
      </div>

      {/* Staff Login Portal URL Info Card */}
      <div className="rounded-2xl border border-[#16845B]/30 bg-[#E8F5EE] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#16845B]/20 flex items-center justify-center text-[#16845B] shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#16845B] uppercase tracking-wider">
              Dedicated Staff Login Portal
            </span>
            <p className="text-xs text-[#172B25] font-semibold mt-0.5">
              https://www.restronexpos.com/staff/login
            </p>
            <p className="text-[11px] text-[#2D5A47]">
              Share this dedicated URL with your employees to access POS, KDS, and tables.
            </p>
          </div>
        </div>

        <button
          onClick={copyStaffLoginUrl}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#16845B]/30 text-xs font-bold text-[#16845B] hover:bg-[#F8FAF9] transition shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-[#16845B]" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedLink ? "Copied!" : "Copy Staff Login URL"}
        </button>
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

      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <Card className="bg-white border-[#E5EBE7] shadow-sm">
          <CardHeader className="pb-3 border-b border-[#E5EBE7]">
            <CardTitle className="text-sm font-bold text-[#172B25] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#16845B]" />
              Pending Team Invitations ({pendingInvitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-[#E5EBE7]">
            {pendingInvitations.map((inv) => (
              <div key={inv.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#172B25]">{inv.email}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {inv.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#718078] mt-0.5">
                    Invited {new Date(inv.createdAt).toLocaleDateString()} • Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {inv.rawToken && (
                    <>
                      <button
                        onClick={() => copyInviteLink(inv.rawToken!, inv.id)}
                        className="px-3 py-1.5 rounded-xl border border-[#16845B]/30 bg-white hover:bg-[#E8F5EE] text-xs font-semibold text-[#16845B] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Copy single-use invite link"
                      >
                        {copiedInviteId === inv.id ? <Check className="w-3.5 h-3.5 text-[#16845B]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedInviteId === inv.id ? "Copied!" : "Copy Link"}</span>
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `Hello! You have been invited to join our restaurant team on RestroNex. Click here to accept your invitation: https://www.restronexpos.com/staff/accept-invitation?token=${inv.rawToken}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-xs font-semibold text-[#128C7E] transition flex items-center gap-1.5 shadow-2xs"
                        title="Share via WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => handleResendInvitation(inv.id, inv.email)}
                    disabled={resendingId === inv.id}
                    className="px-3 py-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-xs font-semibold text-blue-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Resend official Clerk invitation email"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{resendingId === inv.id ? "Sending..." : "Resend Email"}</span>
                  </button>
                  <button
                    onClick={() => handleRevokeInvitation(inv.id, inv.email)}
                    className="px-3 py-1.5 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
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
          {["ALL", "OWNER", "MANAGER", "CASHIER", "WAITER", "KITCHEN_STAFF", "INVENTORY_MANAGER"].map((r) => (
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

      {/* Active Staff Members List */}
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
              No staff members matching your filter. Click <b>Invite Staff Member</b> above to invite your team.
            </div>
          ) : (
            filteredMembers.map((m) => {
              const roleMeta = ROLES_INFO[m.role] || ROLES_INFO.CASHIER;
              const RoleIcon = roleMeta.icon;
              const isSuspended = m.status === "SUSPENDED";

              return (
                <div
                  key={m.id}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    isSuspended ? "bg-amber-50/40 opacity-80" : "hover:bg-[#F8FAF9]/60"
                  }`}
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

                        {isSuspended && (
                          <span className="rounded-full bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 text-[9px] font-bold">
                            SUSPENDED
                          </span>
                        )}
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

                      {/* Suspend / Reactivate Button */}
                      <button
                        onClick={() => handleToggleStatus(m.id, m.status, m.user.name)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                          isSuspended
                            ? "bg-emerald-50 text-[#16845B] border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                        }`}
                        title={isSuspended ? "Reactivate Staff" : "Suspend Staff Access"}
                      >
                        {isSuspended ? <CheckCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                      </button>

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

      {/* Add Staff / Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl border border-[#E5EBE7]">
            <div className="flex justify-between items-center border-b border-[#E5EBE7] pb-3">
              <h3 className="font-extrabold text-base text-[#172B25] flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#16845B]" />
                Invite Staff Member
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
                <Label className="text-xs font-bold text-[#172B25]">Full Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
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
                  <option value="">All Outlets (Global Access)</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs text-[#4A5D55] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendInvitationMode}
                    onChange={(e) => setSendInvitationMode(e.target.checked)}
                    className="rounded border-[#D2DFD8] text-[#16845B] focus:ring-[#16845B]"
                  />
                  <span>Generate single-use invite link &amp; dispatch Clerk email</span>
                </label>
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#EEF3F0]">
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
                  {submitting ? "Processing..." : sendInvitationMode ? "Send Invitation" : "Add Staff Member"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invitation Created & Ready to Share Dialog */}
      {createdInvite && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl border border-[#E5EBE7]">
            <div className="flex justify-between items-start border-b border-[#E5EBE7] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/20 flex items-center justify-center text-[#16845B]">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#172B25]">
                    Staff Invitation Ready!
                  </h3>
                  <p className="text-xs text-[#718078] mt-0.5">
                    {createdInvite.email} • {createdInvite.role}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreatedInvite(null)}
                className="h-8 w-8 rounded-full bg-[#F8FAF9] text-[#718078] hover:text-[#172B25] grid place-items-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createdInvite.emailSent ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Official Clerk Invitation Email Dispatched</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    An email has been delivered to <b>{createdInvite.email}</b>. You can also copy the link below or send it via WhatsApp.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                <Share2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Direct Staff Invitation Link Generated</p>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    Share the link below with your employee to grant them immediate access.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#718078] uppercase tracking-wider">
                Single-Use Invite Link
              </label>
              <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7]">
                <input
                  readOnly
                  value={createdInvite.url}
                  className="flex-1 bg-transparent text-xs text-[#172B25] font-mono px-2 outline-none select-all overflow-hidden text-ellipsis"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdInvite.url);
                    setCopiedCreatedLink(true);
                    setTimeout(() => setCopiedCreatedLink(false), 2500);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  {copiedCreatedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCreatedLink ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Hello! You have been invited to join our restaurant team on RestroNex. Click here to accept your staff invitation: ${createdInvite.url}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white py-3 text-xs font-bold transition shadow-xs"
              >
                <Share2 className="w-4 h-4" />
                <span>Share on WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => setCreatedInvite(null)}
                className="px-6 py-3 rounded-2xl border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] text-xs font-bold text-[#172B25] transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
