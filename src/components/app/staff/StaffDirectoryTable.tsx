"use client";

import React, { useState } from "react";
import {
  Search,
  Building2,
  Mail,
  Phone,
  Copy,
  Check,
  RotateCw,
  Trash2,
  Eye,
  Edit2,
  Ban,
  CheckCircle2,
  Crown,
  Shield,
  CreditCard,
  Utensils,
  ChefHat,
  Boxes,
  Lock,
  Clock,
  Send,
} from "lucide-react";

export interface StaffMemberData {
  id: string; // membershipId
  userId: string;
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
  staffProfile?: {
    id: string;
    fullName: string;
    phone?: string | null;
    employeeCode?: string | null;
    jobTitle?: string | null;
    status: string;
  } | null;
  outletMembers?: {
    id: string;
    outletId: string;
    outlet: { id: string; name: string };
  }[];
}

export interface PendingInvitationData {
  id: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  role: string;
  rawToken?: string | null;
  outletId?: string | null;
  outlet?: { id: string; name: string } | null;
  expiresAt: string;
  createdAt: string;
}

interface StaffDirectoryProps {
  members: StaffMemberData[];
  pendingInvitations: PendingInvitationData[];
  outlets: { id: string; name: string }[];
  currentUserId?: string;
  currentRole: string;
  onViewProfile: (member: StaffMemberData) => void;
  onEditMember: (member: StaffMemberData) => void;
  onToggleStatus: (membershipId: string, currentStatus: string, name: string) => void;
  onRemoveMember: (membershipId: string, name: string) => void;
  onResendInvite: (id: string, email: string) => void;
  onRevokeInvite: (id: string, email: string) => void;
  resendingId?: string | null;
}

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  OWNER: { label: "Owner", icon: Crown, color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  HEAD_OFFICE: { label: "Head Office", icon: Crown, color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  MANAGER: { label: "Manager", icon: Shield, color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  CASHIER: { label: "Cashier", icon: CreditCard, color: "bg-amber-50 text-amber-800 border-amber-200" },
  WAITER: { label: "Waiter", icon: Utensils, color: "bg-teal-50 text-teal-800 border-teal-200" },
  KITCHEN_STAFF: { label: "Kitchen Chef", icon: ChefHat, color: "bg-rose-50 text-rose-800 border-rose-200" },
  INVENTORY_MANAGER: { label: "Inventory Mgr", icon: Boxes, color: "bg-purple-50 text-purple-800 border-purple-200" },
  ACCOUNTANT: { label: "Accountant", icon: CreditCard, color: "bg-sky-50 text-sky-800 border-sky-200" },
};

export function StaffDirectoryTable({
  members,
  pendingInvitations,
  outlets,
  currentUserId,
  currentRole,
  onViewProfile,
  onEditMember,
  onToggleStatus,
  onRemoveMember,
  onResendInvite,
  onRevokeInvite,
  resendingId,
}: StaffDirectoryProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [outletFilter, setOutletFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED" | "INVITED">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isOwnerOrManager = currentRole === "OWNER" || currentRole === "MANAGER" || currentRole === "HEAD_OFFICE";

  // Filter staff members
  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    const nameMatch = (m.staffProfile?.fullName || m.user.name || "").toLowerCase().includes(q);
    const emailMatch = (m.user.email || "").toLowerCase().includes(q);
    const codeMatch = (m.staffProfile?.employeeCode || "").toLowerCase().includes(q);
    const phoneMatch = (m.staffProfile?.phone || "").toLowerCase().includes(q);
    const searchMatch = !q || nameMatch || emailMatch || codeMatch || phoneMatch;

    const roleMatch = roleFilter === "ALL" || m.role === roleFilter;

    let outletMatch = true;
    if (outletFilter !== "ALL") {
      const isPrimary = m.outletId === outletFilter;
      const isMulti = m.outletMembers?.some((om) => om.outletId === outletFilter);
      outletMatch = isPrimary || !!isMulti;
    }

    const statusMatch =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && m.status === "ACTIVE") ||
      (statusFilter === "SUSPENDED" && m.status === "SUSPENDED");

    return searchMatch && roleMatch && outletMatch && statusMatch;
  });

  // Filter pending invitations
  const filteredInvitations = pendingInvitations.filter((inv) => {
    const q = search.toLowerCase();
    const searchMatch = !q || inv.email.toLowerCase().includes(q) || (inv.fullName || "").toLowerCase().includes(q);
    const roleMatch = roleFilter === "ALL" || inv.role === roleFilter;
    const outletMatch = outletFilter === "ALL" || inv.outletId === outletFilter;
    return searchMatch && roleMatch && outletMatch;
  });

  function copyInviteLink(rawToken: string, id: string) {
    const url = `https://www.restronexpos.com/staff/accept-invitation?token=${rawToken}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E5EBE7] bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#718078]" />
          <input
            type="text"
            placeholder="Search by name, email, code or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] py-2 pl-9 pr-3 text-xs text-[#172B25] placeholder-[#718078] outline-none transition focus:border-[#16845B] focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] p-0.5 text-xs font-semibold">
            {(["ALL", "ACTIVE", "SUSPENDED", "INVITED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-2.5 py-1 text-[11px] transition ${
                  statusFilter === s
                    ? "bg-white text-[#172B25] shadow-xs"
                    : "text-[#718078] hover:text-[#172B25]"
                }`}
              >
                {s === "ALL" && `All (${members.length})`}
                {s === "ACTIVE" && `Active (${members.filter((m) => m.status === "ACTIVE").length})`}
                {s === "SUSPENDED" && `Suspended (${members.filter((m) => m.status === "SUSPENDED").length})`}
                {s === "INVITED" && `Invited (${pendingInvitations.length})`}
              </button>
            ))}
          </div>

          {/* Role Filter Dropdown */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#172B25] outline-none hover:bg-[#F2F5F3]"
          >
            <option value="ALL">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="MANAGER">Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="WAITER">Waiter</option>
            <option value="KITCHEN_STAFF">Kitchen Chef</option>
            <option value="INVENTORY_MANAGER">Inventory Manager</option>
            <option value="ACCOUNTANT">Accountant</option>
          </select>

          {/* Outlet Filter Dropdown */}
          <select
            value={outletFilter}
            onChange={(e) => setOutletFilter(e.target.value)}
            className="rounded-lg border border-[#E5EBE7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#172B25] outline-none hover:bg-[#F2F5F3]"
          >
            <option value="ALL">All Outlets</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Staff Directory Table */}
      {statusFilter !== "INVITED" && (
        <div className="overflow-hidden rounded-xl border border-[#E5EBE7] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9] text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Designation & Role</th>
                  <th className="py-3 px-4">Assigned Outlets</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7] text-xs">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#718078]">
                      No staff members match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const profile = member.staffProfile;
                    const displayName = profile?.fullName || member.user.name || "Employee";
                    const displayCode = profile?.employeeCode;
                    const displayPhone = profile?.phone;
                    const displayJobTitle = profile?.jobTitle;
                    const roleInfo = ROLE_CONFIG[member.role] || {
                      label: member.role,
                      icon: Shield,
                      color: "bg-gray-50 text-gray-800 border-gray-200",
                    };
                    const RoleIcon = roleInfo.icon;
                    const isSelf = member.userId === currentUserId;
                    const isOwnerRole = member.role === "OWNER";

                    // Assigned Outlets list
                    const multiOutlets = member.outletMembers?.map((om) => om.outlet.name) || [];
                    const primaryOutletName = member.outlet?.name;

                    return (
                      <tr key={member.id} className="transition hover:bg-[#F8FAF9]">
                        {/* Employee Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#16845B]/10 font-bold text-[#16845B]">
                              {displayName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#172B25]">{displayName}</span>
                                {isSelf && (
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-[#718078]">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {member.user.email}
                                </span>
                                {displayPhone && (
                                  <span className="flex items-center gap-1 border-l border-[#E5EBE7] pl-2">
                                    <Phone className="h-3 w-3" />
                                    {displayPhone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Designation & Role */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {displayJobTitle ? (
                              <div className="font-semibold text-[#172B25]">{displayJobTitle}</div>
                            ) : null}
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${roleInfo.color}`}
                            >
                              <RoleIcon className="h-3 w-3" />
                              {roleInfo.label}
                            </span>
                            {displayCode && (
                              <div className="text-[10px] font-mono text-[#718078]">ID: {displayCode}</div>
                            )}
                          </div>
                        </td>

                        {/* Assigned Outlets */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {isOwnerRole ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                <Building2 className="h-3 w-3" /> All Outlets
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {primaryOutletName && (
                                  <span className="inline-flex items-center gap-1 rounded border border-[#E5EBE7] bg-[#F8FAF9] px-2 py-0.5 text-[11px] font-semibold text-[#172B25]">
                                    <Building2 className="h-3 w-3 text-[#16845B]" />
                                    {primaryOutletName} (Primary)
                                  </span>
                                )}
                                {multiOutlets
                                  .filter((name) => name !== primaryOutletName)
                                  .map((name, i) => (
                                    <span
                                      key={i}
                                      className="rounded border border-[#E5EBE7] bg-white px-1.5 py-0.5 text-[10px] text-[#55655D]"
                                    >
                                      {name}
                                    </span>
                                  ))}
                                {!primaryOutletName && multiOutlets.length === 0 && (
                                  <span className="text-[11px] text-[#718078] italic">Unassigned</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {member.status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                              <Ban className="h-3 w-3" /> Suspended
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 px-4 text-[#718078]">
                          {new Date(member.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onViewProfile(member)}
                              className="rounded-lg p-1.5 text-[#718078] hover:bg-[#F2F5F3] hover:text-[#172B25]"
                              title="View Full Profile"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {isOwnerOrManager && (
                              <button
                                onClick={() => onEditMember(member)}
                                className="rounded-lg p-1.5 text-[#718078] hover:bg-[#F2F5F3] hover:text-[#172B25]"
                                title="Edit Assignments & Permissions"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}

                            {isOwnerOrManager && !isSelf && (
                              <button
                                onClick={() => onToggleStatus(member.id, member.status, displayName)}
                                className={`rounded-lg p-1.5 ${
                                  member.status === "ACTIVE"
                                    ? "text-amber-600 hover:bg-amber-50"
                                    : "text-emerald-600 hover:bg-emerald-50"
                                }`}
                                title={member.status === "ACTIVE" ? "Suspend Access" : "Reactivate Access"}
                              >
                                {member.status === "ACTIVE" ? (
                                  <Ban className="h-4 w-4" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </button>
                            )}

                            {isOwnerOrManager && !isSelf && !isOwnerRole && (
                              <button
                                onClick={() => onRemoveMember(member.id, displayName)}
                                className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                                title="Remove Staff Member"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Invitations Section */}
      {(statusFilter === "ALL" || statusFilter === "INVITED") && (
        <div className="overflow-hidden rounded-xl border border-[#E5EBE7] bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5EBE7] bg-[#F8FAF9] px-4 py-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#16845B]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#172B25]">
                Pending Staff Invitations ({filteredInvitations.length})
              </h3>
            </div>
            <span className="text-[11px] text-[#718078]">
              Invitations expire automatically after 7 days
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9]/50 text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                  <th className="py-2.5 px-4">Invited Email</th>
                  <th className="py-2.5 px-4">Assigned Role</th>
                  <th className="py-2.5 px-4">Assigned Outlet</th>
                  <th className="py-2.5 px-4">Expires In</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7] text-xs">
                {filteredInvitations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#718078]">
                      No pending invitations currently active.
                    </td>
                  </tr>
                ) : (
                  filteredInvitations.map((inv) => {
                    const roleInfo = ROLE_CONFIG[inv.role] || {
                      label: inv.role,
                      color: "bg-gray-50 text-gray-800 border-gray-200",
                    };
                    const expiryDate = new Date(inv.expiresAt);
                    const daysRemaining = Math.max(
                      0,
                      Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    );

                    return (
                      <tr key={inv.id} className="transition hover:bg-[#F8FAF9]">
                        <td className="py-3 px-4 font-semibold text-[#172B25]">
                          <div className="flex items-center gap-2">
                            <span>{inv.email}</span>
                            {inv.fullName && (
                              <span className="text-[#718078] text-[11px]">({inv.fullName})</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${roleInfo.color}`}
                          >
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#718078]">
                          {inv.outlet?.name || "All Outlets"}
                        </td>
                        <td className="py-3 px-4 text-[#718078]">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="h-3 w-3 text-amber-600" />
                            {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.rawToken && (
                              <button
                                onClick={() => copyInviteLink(inv.rawToken!, inv.id)}
                                className="flex items-center gap-1 rounded border border-[#E5EBE7] bg-white px-2 py-1 text-[11px] font-semibold text-[#172B25] hover:bg-[#F2F5F3]"
                                title="Copy invitation link"
                              >
                                {copiedId === inv.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    <span className="text-emerald-700">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 text-[#718078]" />
                                    <span>Copy Link</span>
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              onClick={() => onResendInvite(inv.id, inv.email)}
                              disabled={resendingId === inv.id}
                              className="flex items-center gap-1 rounded border border-[#E5EBE7] bg-white px-2 py-1 text-[11px] font-semibold text-[#172B25] hover:bg-[#F2F5F3] disabled:opacity-50"
                              title="Resend invitation email"
                            >
                              <RotateCw className={`h-3 w-3 text-[#16845B] ${resendingId === inv.id ? "animate-spin" : ""}`} />
                              <span>Resend</span>
                            </button>

                            <button
                              onClick={() => onRevokeInvite(inv.id, inv.email)}
                              className="rounded p-1 text-rose-600 hover:bg-rose-50"
                              title="Revoke invitation"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
