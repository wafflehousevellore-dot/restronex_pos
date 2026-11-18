"use client";

import React, { useState } from "react";
import {
  X,
  Mail,
  UserPlus,
  Shield,
  Building2,
  Copy,
  Check,
  Send,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PERMISSION_GROUPS, ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, StaffRole, PermissionKey } from "@/lib/permissions";

interface StaffInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  outlets: { id: string; name: string }[];
  onInviteSuccess: () => void;
}

export function StaffInviteModal({
  isOpen,
  onClose,
  outlets,
  onInviteSuccess,
}: StaffInviteModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState("CASHIER");
  const [primaryOutletId, setPrimaryOutletId] = useState("");
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([]);
  const [sendInvitationMode, setSendInvitationMode] = useState(true);

  // Custom permissions override
  const [customizePermissions, setCustomizePermissions] = useState(false);
  const [customPermissions, setCustomPermissions] = useState<PermissionKey[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success state with invite link
  const [inviteResult, setInviteResult] = useState<{
    url: string;
    email: string;
    emailSent: boolean;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  function handleRoleChange(newRole: string) {
    setRole(newRole);
    const defaults = DEFAULT_ROLE_PERMISSIONS[newRole as StaffRole] || [];
    setCustomPermissions([...defaults]);
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
    if (!email.trim()) {
      setErrorMsg("Email address is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          employeeCode: employeeCode.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
          role: role.toUpperCase(),
          outletId: primaryOutletId || null,
          outletIds: selectedOutletIds.length > 0 ? selectedOutletIds : undefined,
          permissions: customizePermissions ? customPermissions : undefined,
          sendInvitation: sendInvitationMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to add staff member.");
      } else {
        if (data.inviteUrl) {
          setInviteResult({
            url: data.inviteUrl,
            email: email.trim(),
            emailSent: !!data.emailSent,
          });
        } else {
          onInviteSuccess();
          handleClose();
        }
      }
    } catch {
      setErrorMsg("An unexpected error occurred while processing.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setName("");
    setEmail("");
    setPhone("");
    setEmployeeCode("");
    setJobTitle("");
    setRole("CASHIER");
    setPrimaryOutletId("");
    setSelectedOutletIds([]);
    setCustomizePermissions(false);
    setCustomPermissions([]);
    setErrorMsg(null);
    setInviteResult(null);
    setCopiedLink(false);
    onClose();
  }

  function copyInviteUrl() {
    if (inviteResult?.url) {
      navigator.clipboard.writeText(inviteResult.url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-[#E5EBE7] bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5EBE7] px-6 py-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#16845B]" />
            <h2 className="text-base font-bold text-[#172B25]">
              {inviteResult ? "Invitation Generated" : "Add or Invite Staff Member"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[#718078] hover:bg-[#F2F5F3] hover:text-[#172B25]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {inviteResult ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#172B25]">Invitation Link Ready!</h3>
                <p className="mt-1 text-xs text-[#718078]">
                  {inviteResult.emailSent
                    ? `An email has been dispatched to ${inviteResult.email}. You can also share the direct link below.`
                    : `Invitation created for ${inviteResult.email}. Share this secure single-use registration link.`}
                </p>
              </div>

              <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3 text-left">
                <label className="text-[11px] font-bold text-[#718078]">Secure Invite Link:</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteResult.url}
                    className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2 font-mono text-xs text-[#172B25] outline-none"
                  />
                  <button
                    onClick={copyInviteUrl}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#16845B] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#116B49]"
                  >
                    {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedLink ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    onInviteSuccess();
                    handleClose();
                  }}
                  className="w-full rounded-lg bg-[#16845B] py-2.5 text-xs font-bold text-white hover:bg-[#116B49]"
                >
                  Done & Return to Directory
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700 font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Basic Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B25]">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#172B25]">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="staff@restaurant.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#172B25]">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#172B25]">Employee Code</label>
                  <input
                    type="text"
                    placeholder="EMP-014"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    className="w-full rounded-lg border border-[#E5EBE7] bg-white p-2.5 outline-none focus:border-[#16845B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#172B25]">Designation / Title</label>
                  <input
                    type="text"
                    placeholder="Lead Cashier"
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
                      <option value="">All Outlets / Not Fixed</option>
                      {outlets.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#718078]">Multi-Outlet Access</label>
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

              {/* Custom Permission Overrides Accordion */}
              <div className="rounded-xl border border-[#E5EBE7] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-semibold text-[#172B25] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customizePermissions}
                      onChange={(e) => setCustomizePermissions(e.target.checked)}
                      className="h-3.5 w-3.5 text-[#16845B]"
                    />
                    <span>Customize granular permissions for this employee</span>
                  </label>
                </div>

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

              {/* Invitation Mode Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3">
                <div>
                  <div className="font-semibold text-[#172B25]">Send Email Invitation</div>
                  <div className="text-[11px] text-[#718078]">
                    {sendInvitationMode
                      ? "Dispatches secure invite link with 7-day expiration"
                      : "Directly provision account for instant internal activation"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sendInvitationMode}
                  onChange={(e) => setSendInvitationMode(e.target.checked)}
                  className="h-4 w-4 text-[#16845B]"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#16845B] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{submitting ? "Processing..." : "Generate Staff Invitation"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-[#E5EBE7] bg-white px-4 py-2.5 font-semibold text-[#172B25] hover:bg-[#F2F5F3]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
