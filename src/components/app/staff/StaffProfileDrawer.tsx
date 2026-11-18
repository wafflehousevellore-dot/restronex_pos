"use client";

import React from "react";
import {
  X,
  Mail,
  Phone,
  Shield,
  Building2,
  Calendar,
  CheckCircle2,
  Ban,
  Lock,
  Edit2,
  Check,
} from "lucide-react";
import { StaffMemberData } from "./StaffDirectoryTable";
import { PERMISSION_GROUPS, getEffectivePermissions, PermissionKey } from "@/lib/permissions";

interface StaffProfileDrawerProps {
  member: StaffMemberData | null;
  onClose: () => void;
  onEdit: (member: StaffMemberData) => void;
  isOwnerOrManager: boolean;
}

export function StaffProfileDrawer({
  member,
  onClose,
  onEdit,
  isOwnerOrManager,
}: StaffProfileDrawerProps) {
  if (!member) return null;

  const profile = member.staffProfile;
  const displayName = profile?.fullName || member.user.name || "Employee";
  const displayCode = profile?.employeeCode;
  const displayPhone = profile?.phone;
  const displayJobTitle = profile?.jobTitle;

  // Custom permissions parsing
  let customPermissions: string[] | null = null;
  if (member.permissionsJson) {
    try {
      customPermissions = JSON.parse(member.permissionsJson);
    } catch {
      customPermissions = null;
    }
  }

  const effectivePermissions = getEffectivePermissions(member.role, customPermissions);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#16845B]" />
            <h2 className="text-base font-bold text-[#172B25]">Employee Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#718078] hover:bg-[#F2F5F3] hover:text-[#172B25]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Identity Card */}
          <div className="flex items-start gap-4 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#16845B] text-lg font-bold text-white shadow-xs">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#172B25]">{displayName}</h3>
                {member.status === "ACTIVE" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                    <Ban className="h-3 w-3" /> Suspended
                  </span>
                )}
              </div>

              {displayJobTitle && (
                <div className="text-xs font-semibold text-[#16845B]">{displayJobTitle}</div>
              )}

              <div className="text-xs font-bold uppercase tracking-wider text-[#718078]">
                Role: <span className="text-[#172B25]">{member.role}</span>
              </div>

              {displayCode && (
                <div className="text-[11px] font-mono text-[#718078]">Code: {displayCode}</div>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#718078]">
              Contact & System Info
            </h4>
            <div className="space-y-2 rounded-xl border border-[#E5EBE7] p-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#E5EBE7]/50">
                <span className="flex items-center gap-2 text-[#718078]">
                  <Mail className="h-3.5 w-3.5" /> Email
                </span>
                <span className="font-semibold text-[#172B25]">{member.user.email}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#E5EBE7]/50">
                <span className="flex items-center gap-2 text-[#718078]">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </span>
                <span className="font-semibold text-[#172B25]">{displayPhone || "Not set"}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-[#718078]">
                  <Calendar className="h-3.5 w-3.5" /> Member Since
                </span>
                <span className="font-semibold text-[#172B25]">
                  {new Date(member.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Outlet Branch Authorization */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#718078]">
              Assigned Outlet Workspaces
            </h4>
            <div className="rounded-xl border border-[#E5EBE7] p-3 space-y-2 text-xs">
              {member.role === "OWNER" ? (
                <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                  <Building2 className="h-4 w-4" />
                  <span>Full Chain Authority: Access to all current & future outlets</span>
                </div>
              ) : (
                <>
                  {member.outlet && (
                    <div className="flex items-center justify-between py-1 border-b border-[#E5EBE7]/50">
                      <span className="text-[#718078]">Primary Outlet</span>
                      <span className="font-bold text-[#16845B]">{member.outlet.name}</span>
                    </div>
                  )}

                  {member.outletMembers && member.outletMembers.length > 0 ? (
                    <div>
                      <span className="text-[11px] text-[#718078]">Permitted Outlets:</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {member.outletMembers.map((om) => (
                          <span
                            key={om.id}
                            className="rounded-md border border-[#E5EBE7] bg-[#F8FAF9] px-2 py-0.5 text-[11px] font-semibold text-[#172B25]"
                          >
                            {om.outlet.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    !member.outlet && (
                      <span className="text-[#718078] italic">No specific outlets assigned.</span>
                    )
                  )}
                </>
              )}
            </div>
          </div>

          {/* Granular Module Permissions Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#718078]">
                Module Capabilities ({effectivePermissions.length} Granted)
              </h4>
              {customPermissions && (
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  Custom Overrides
                </span>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-[#E5EBE7] p-3 text-xs">
              {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
                const grantedInGroup = group.permissions.filter((p) =>
                  effectivePermissions.includes(p.key)
                );

                if (grantedInGroup.length === 0) return null;

                return (
                  <div key={groupKey} className="border-b border-[#E5EBE7]/40 pb-2 last:border-0 last:pb-0">
                    <div className="font-semibold text-[#172B25] text-[11px] mb-1">
                      {group.label}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {grantedInGroup.map((p) => (
                        <span
                          key={p.key}
                          className="inline-flex items-center gap-1 rounded bg-[#F0F5F2] px-1.5 py-0.5 text-[10px] text-[#16845B]"
                          title={p.description}
                        >
                          <Check className="h-2.5 w-2.5 text-[#16845B]" />
                          {p.label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        {isOwnerOrManager && (
          <div className="border-t border-[#E5EBE7] bg-[#F8FAF9] p-4 flex gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(member);
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#16845B] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] transition"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit Staff & Permissions</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-[#E5EBE7] bg-white px-4 py-2.5 text-xs font-semibold text-[#172B25] hover:bg-[#F2F5F3]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
