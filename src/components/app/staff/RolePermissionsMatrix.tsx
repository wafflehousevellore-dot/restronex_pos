"use client";

import React, { useState } from "react";
import {
  Shield,
  Check,
  Minus,
  Plus,
  Crown,
  Lock,
  ChevronDown,
  ChevronUp,
  X,
  Sliders,
} from "lucide-react";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  STAFF_ROLES,
  PERMISSION_GROUPS,
  PermissionKey,
} from "@/lib/permissions";
import { CustomRoleItem } from "@/app/api/staff/roles/route";

interface RolePermissionsMatrixProps {
  systemRoles: CustomRoleItem[];
  customRoles: CustomRoleItem[];
  onRoleCreated: () => void;
  isOwnerOrManager: boolean;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}

export function RolePermissionsMatrix({
  systemRoles,
  customRoles,
  onRoleCreated,
  isOwnerOrManager,
  isCreateModalOpen,
  setIsCreateModalOpen,
}: RolePermissionsMatrixProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // New Custom Role Form State
  const [roleName, setRoleName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const allDisplayRoles = [...systemRoles, ...customRoles];

  function togglePermissionSelection(key: PermissionKey) {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  }

  function handleSelectGroup(groupKey: string) {
    const group = PERMISSION_GROUPS[groupKey];
    if (!group) return;
    const groupKeys = group.permissions.map((p) => p.key);
    const allSelected = groupKeys.every((k) => selectedPermissions.includes(k));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((k) => !groupKeys.includes(k)));
    } else {
      const set = new Set([...selectedPermissions, ...groupKeys]);
      setSelectedPermissions(Array.from(set));
    }
  }

  async function handleCreateRoleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleName.trim() || !roleLabel.trim()) {
      setErrorMsg("Role code and display label are required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/staff/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roleName.trim().toUpperCase(),
          label: roleLabel.trim(),
          description: roleDescription.trim(),
          permissions: selectedPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to create role.");
      } else {
        setIsCreateModalOpen(false);
        setRoleName("");
        setRoleLabel("");
        setRoleDescription("");
        setSelectedPermissions([]);
        onRoleCreated();
      }
    } catch {
      setErrorMsg("An unexpected error occurred while saving role.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Intro Header */}
      <div className="flex flex-col gap-2 rounded-xl border border-[#E5EBE7] bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#172B25] flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#16845B]" />
            Role-Based Access Control (RBAC) Matrix
          </h3>
          <p className="text-xs text-[#718078] mt-0.5">
            Review and configure granular capabilities across restaurant modules.
          </p>
        </div>

        {isOwnerOrManager && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#16845B] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] transition shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Create Custom Role</span>
          </button>
        )}
      </div>

      {/* Permissions Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-[#E5EBE7] bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5EBE7] bg-[#F8FAF9] text-[11px] font-bold text-[#718078]">
                <th className="py-3 px-4 min-w-[220px]">Module / Capability</th>
                {allDisplayRoles.map((r) => (
                  <th key={r.id} className="py-3 px-3 text-center min-w-[100px]">
                    <div className="font-bold text-[#172B25]">{r.label}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[#718078]">
                      {r.isSystemRole ? "System" : "Custom"}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-xs">
              {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
                const isExpanded = expandedGroup === groupKey;

                return (
                  <React.Fragment key={groupKey}>
                    {/* Category Group Header Row */}
                    <tr className="bg-[#F8FAF9]/70 font-semibold text-[#172B25]">
                      <td colSpan={allDisplayRoles.length + 1} className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => setExpandedGroup(isExpanded ? null : groupKey)}
                          className="flex items-center gap-2 text-xs font-bold text-[#172B25] hover:text-[#16845B]"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-[#16845B]" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-[#718078]" />
                          )}
                          <span>{group.label}</span>
                          <span className="text-[10px] font-normal text-[#718078]">
                            ({group.permissions.length} actions)
                          </span>
                        </button>
                      </td>
                    </tr>

                    {/* Permissions rows under this category */}
                    {(isExpanded || groupKey === "pos" || groupKey === "orders") &&
                      group.permissions.map((perm) => (
                        <tr key={perm.key} className="hover:bg-[#F8FAF9]/50 transition">
                          <td className="py-2.5 px-4 pl-8">
                            <div className="font-semibold text-[#172B25]">{perm.label}</div>
                            <div className="text-[10px] text-[#718078]">{perm.description}</div>
                          </td>

                          {allDisplayRoles.map((role) => {
                            const isGranted =
                              role.name === "OWNER" || role.permissions.includes(perm.key);

                            return (
                              <td key={role.id} className="py-2.5 px-3 text-center">
                                {isGranted ? (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  </span>
                                ) : (
                                  <span className="inline-flex h-5 w-5 items-center justify-center text-gray-300">
                                    <Minus className="h-3 w-3" />
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Custom Role Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-[#E5EBE7] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#16845B]" />
                <h2 className="text-base font-bold text-[#172B25]">Create Custom Staff Role</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1.5 text-[#718078] hover:bg-[#F2F5F3] hover:text-[#172B25]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700 font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B25]">
                    Role Code (Identifier) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUPERVISOR"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 font-mono uppercase text-[#172B25] outline-none focus:border-[#16845B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#172B25]">
                    Display Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Floor Supervisor"
                    value={roleLabel}
                    onChange={(e) => setRoleLabel(e.target.value)}
                    className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 text-[#172B25] outline-none focus:border-[#16845B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#172B25]">Role Description</label>
                <textarea
                  rows={2}
                  placeholder="Outline responsibilities and station boundaries for this role..."
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 text-[#172B25] outline-none focus:border-[#16845B]"
                />
              </div>

              {/* Permission Checkbox Selector */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#172B25]">
                    Module Permissions ({selectedPermissions.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPermissions.length === ALL_PERMISSIONS.length) {
                        setSelectedPermissions([]);
                      } else {
                        setSelectedPermissions([...ALL_PERMISSIONS]);
                      }
                    }}
                    className="text-[11px] font-semibold text-[#16845B] hover:underline"
                  >
                    {selectedPermissions.length === ALL_PERMISSIONS.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div className="space-y-2 rounded-xl border border-[#E5EBE7] p-3 max-h-60 overflow-y-auto">
                  {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
                    const groupKeys = group.permissions.map((p) => p.key);
                    const isGroupSelected = groupKeys.every((k) => selectedPermissions.includes(k));

                    return (
                      <div key={groupKey} className="border-b border-[#E5EBE7]/50 pb-2.5 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-[#172B25] text-xs">{group.label}</span>
                          <button
                            type="button"
                            onClick={() => handleSelectGroup(groupKey)}
                            className="text-[10px] text-[#16845B] hover:underline"
                          >
                            {isGroupSelected ? "Clear Group" : "Select All"}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-2">
                          {group.permissions.map((p) => (
                            <label
                              key={p.key}
                              className="flex items-center gap-1.5 p-1 rounded hover:bg-[#F8FAF9] cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPermissions.includes(p.key)}
                                onChange={() => togglePermissionSelection(p.key)}
                                className="h-3 w-3 text-[#16845B]"
                              />
                              <span className="text-[11px] text-[#172B25]">{p.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#16845B] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{submitting ? "Creating..." : "Save Role & Permissions"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-[#E5EBE7] bg-white px-4 py-2.5 font-semibold text-[#172B25] hover:bg-[#F2F5F3]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
