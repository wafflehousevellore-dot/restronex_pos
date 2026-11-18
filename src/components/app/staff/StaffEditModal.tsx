"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Edit2,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { StaffMemberData } from "./StaffDirectoryTable";
import { PERMISSION_GROUPS, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, StaffRole, PermissionKey } from "@/lib/permissions";

interface StaffEditModalProps {
  member: StaffMemberData | null;
  isOpen: boolean;
  onClose: () => void;
  outlets: { id: string; name: string }[];
  onSaveSuccess: () => void;
}

export function StaffEditModal({
  member,
  isOpen,
  onClose,
  outlets,
  onSaveSuccess,
}: StaffEditModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState("CASHIER");
  const [primaryOutletId, setPrimaryOutletId] = useState("");
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([]);

  // Permissions
  const [customizePermissions, setCustomizePermissions] = useState(false);
  const [customPermissions, setCustomPermissions] = useState<PermissionKey[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      const profile = member.staffProfile;
      setName(profile?.fullName || member.user.name || "");
      setPhone(profile?.phone || "");
      setEmployeeCode(profile?.employeeCode || "");
      setJobTitle(profile?.jobTitle || "");
      setRole(member.role);
      setPrimaryOutletId(member.outletId || "");

      const omIds = member.outletMembers?.map((om) => om.outletId) || [];
      setSelectedOutletIds(omIds);

      if (member.permissionsJson) {
        try {
          const parsed = JSON.parse(member.permissionsJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomizePermissions(true);
            setCustomPermissions(parsed);
          } else {
            setCustomizePermissions(false);
            setCustomPermissions(DEFAULT_ROLE_PERMISSIONS[member.role as StaffRole] || []);
          }
        } catch {
          setCustomizePermissions(false);
          setCustomPermissions(DEFAULT_ROLE_PERMISSIONS[member.role as StaffRole] || []);
        }
      } else {
        setCustomizePermissions(false);
        setCustomPermissions(DEFAULT_ROLE_PERMISSIONS[member.role as StaffRole] || []);
      }
    }
  }, [member]);

  if (!isOpen || !member) return null;

  function handleRoleChange(newRole: string) {
    setRole(newRole);
    if (!customizePermissions) {
      const defaults = DEFAULT_ROLE_PERMISSIONS[newRole as StaffRole] || [];
      setCustomPermissions([...defaults]);
    }
  }

  function togglePermission(key: PermissionKey) {
    setCustomPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  function handleOutletToggle(outletId: string) {
    setSelectedOutletIds((prev) =>
      prev.includes(outletId) ? prev.filter((id) => id !== outletId) : [...prev, outletId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipId: member!.id,
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
          employeeCode: employeeCode.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
          role: role.toUpperCase(),
          outletId: primaryOutletId || null,
          outletIds: selectedOutletIds,
          permissions: customizePermissions ? customPermissions : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update staff member.");
      } else {
        onSaveSuccess();
        onClose();
      }
    } catch {
      setErrorMsg("An unexpected error occurred while saving.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-[#E5EBE7] bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4">
          <div className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-[#16845B]" />
            <h2 className="text-base font-bold text-[#172B25]">
              Edit Staff Profile & Assignments
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#718078] hover:bg-[#F2F5F3] hover:text-[#172B25]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700 font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">Email (Clerk Account)</label>
                <input
                  type="email"
                  disabled
                  value={member.user.email}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] p-2.5 text-[#718078] cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">Employee Code</label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">Designation / Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-1">
              <label className="font-semibold text-[#172B25]">Staff Role</label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 font-semibold text-[#172B25] outline-none focus:border-[#16845B]"
              >
                <option value="CASHIER">Cashier (POS Register & Billing)</option>
                <option value="WAITER">Waiter (Tableside Order Taking & KOT)</option>
                <option value="KITCHEN_STAFF">Kitchen Chef (KDS & Prep Bump)</option>
                <option value="INVENTORY_MANAGER">Inventory Manager (Stock & Purchases)</option>
                <option value="ACCOUNTANT">Accountant (Reports & Shift Audit)</option>
                <option value="MANAGER">Outlet Manager (Floor, Shifts & Team)</option>
                <option value="OWNER">Owner / Head Office (Full Chain Authority)</option>
              </select>
            </div>

            {/* Outlet Assignments */}
            <div className="space-y-2 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3">
              <div className="font-semibold text-[#172B25] flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#16845B]" />
                <span>Outlet Assignments</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-[#718078]">Primary Outlet</label>
                  <select
                    value={primaryOutletId}
                    onChange={(e) => setPrimaryOutletId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#E5EBE7] bg-white p-2 text-xs text-[#172B25]"
                  >
                    <option value="">All Outlets / Unassigned</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#718078]">Multi-Outlet Workspaces</label>
                  <div className="mt-1 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {outlets.map((o) => (
                      <label
                        key={o.id}
                        className="flex items-center gap-1.5 rounded border border-[#E5EBE7] bg-white px-2 py-1 text-[11px] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedOutletIds.includes(o.id)}
                          onChange={() => handleOutletToggle(o.id)}
                          className="h-3 w-3 text-[#16845B]"
                        />
                        <span>{o.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Permissions Accordion */}
            <div className="rounded-xl border border-[#E5EBE7] p-3 space-y-2">
              <label className="flex items-center gap-2 font-semibold text-[#172B25] cursor-pointer">
                <input
                  type="checkbox"
                  checked={customizePermissions}
                  onChange={(e) => setCustomizePermissions(e.target.checked)}
                  className="h-3.5 w-3.5 text-[#16845B]"
                />
                <span>Override & Customize Granular Permissions</span>
              </label>

              {customizePermissions && (
                <div className="pt-2 space-y-2 divide-y divide-[#E5EBE7]">
                  {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
                    const isExpanded = expandedGroup === groupKey;
                    const countGranted = group.permissions.filter((p) =>
                      customPermissions.includes(p.key)
                    ).length;

                    return (
                      <div key={groupKey} className="pt-2 first:pt-0">
                        <button
                          type="button"
                          onClick={() => setExpandedGroup(isExpanded ? null : groupKey)}
                          className="flex w-full items-center justify-between text-left font-semibold text-[#172B25]"
                        >
                          <span>
                            {group.label}{" "}
                            <span className="text-[11px] text-[#718078] font-normal">
                              ({countGranted}/{group.permissions.length} granted)
                            </span>
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-[#718078]" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-[#718078]" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2">
                            {group.permissions.map((p) => {
                              const isChecked = customPermissions.includes(p.key);
                              return (
                                <label
                                  key={p.key}
                                  className="flex items-start gap-2 p-1 rounded hover:bg-[#F8FAF9] cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(p.key)}
                                    className="mt-0.5 h-3 w-3 text-[#16845B]"
                                  />
                                  <div>
                                    <div className="font-semibold text-[#172B25] text-[11px]">
                                      {p.label}
                                    </div>
                                    <div className="text-[10px] text-[#718078]">
                                      {p.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#16845B] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{submitting ? "Saving..." : "Save Staff Changes"}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#E5EBE7] bg-white px-4 py-2.5 font-semibold text-[#172B25] hover:bg-[#F2F5F3]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
