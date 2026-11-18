"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StaffMetricsCards } from "./StaffMetricsCards";
import { StaffTabsNav, StaffTabMode } from "./StaffTabsNav";
import { StaffDirectoryTable, StaffMemberData, PendingInvitationData } from "./StaffDirectoryTable";
import { StaffProfileDrawer } from "./StaffProfileDrawer";
import { StaffInviteModal } from "./StaffInviteModal";
import { StaffEditModal } from "./StaffEditModal";
import { ShiftManagerView } from "./ShiftManagerView";
import { ShiftModal } from "./ShiftModal";
import { AttendanceDashboard } from "./AttendanceDashboard";
import { AttendanceModal } from "./AttendanceModal";
import { RolePermissionsMatrix } from "./RolePermissionsMatrix";
import { StaffActivityLogsView, ActivityLogItem } from "./StaffActivityLogsView";
import { StaffShiftItem } from "@/app/api/staff/shifts/route";
import { AttendanceItem } from "@/app/api/staff/attendance/route";
import { CustomRoleItem } from "@/app/api/staff/roles/route";
import { Check, AlertCircle, X } from "lucide-react";

export function StaffClient() {
  const [activeTab, setActiveTab] = useState<StaffTabMode>("directory");

  // Data states
  const [members, setMembers] = useState<StaffMemberData[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitationData[]>([]);
  const [outlets, setOutlets] = useState<{ id: string; name: string }[]>([]);
  const [shifts, setShifts] = useState<StaffShiftItem[]>([]);
  const [cashierShifts, setCashierShifts] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceItem[]>([]);
  const [systemRoles, setSystemRoles] = useState<CustomRoleItem[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRoleItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);

  const [currentRole, setCurrentRole] = useState("OWNER");
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Modals & Drawers
  const [selectedProfileMember, setSelectedProfileMember] = useState<StaffMemberData | null>(null);
  const [selectedEditMember, setSelectedEditMember] = useState<StaffMemberData | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isScheduleShiftModalOpen, setIsScheduleShiftModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Load Main Staff & Outlets
  const loadStaffData = useCallback(async () => {
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const j = await res.json();
        setMembers(j.memberships || []);
        setPendingInvitations(j.pendingInvitations || []);
        setOutlets(j.outlets || []);
        if (j.currentRole) setCurrentRole(j.currentRole);
        if (j.currentUserId) setCurrentUserId(j.currentUserId);
      }
    } catch {
      showToast("error", "Failed to fetch staff data");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load Shifts
  const loadShifts = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/shifts");
      if (res.ok) {
        const j = await res.json();
        setShifts(j.shifts || []);
        setCashierShifts(j.cashierShifts || []);
      }
    } catch {
      console.warn("Failed to load shifts");
    }
  }, []);

  // Load Attendance
  const loadAttendance = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/attendance");
      if (res.ok) {
        const j = await res.json();
        setAttendanceRecords(j.records || []);
      }
    } catch {
      console.warn("Failed to load attendance");
    }
  }, []);

  // Load Roles
  const loadRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/roles");
      if (res.ok) {
        const j = await res.json();
        setSystemRoles(j.systemRoles || []);
        setCustomRoles(j.customRoles || []);
      }
    } catch {
      console.warn("Failed to load roles");
    }
  }, []);

  // Load Activity Logs
  const loadActivityLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/activity");
      if (res.ok) {
        const j = await res.json();
        setActivityLogs(j.logs || []);
      }
    } catch {
      console.warn("Failed to load activity logs");
    }
  }, []);

  // Initial Load and 25s polling
  useEffect(() => {
    loadStaffData();
    loadShifts();
    loadAttendance();
    loadRoles();
    loadActivityLogs();

    const interval = setInterval(() => {
      loadStaffData();
      loadShifts();
      loadAttendance();
    }, 25000);

    return () => clearInterval(interval);
  }, [loadStaffData, loadShifts, loadAttendance, loadRoles, loadActivityLogs]);

  // Suspend or Reactivate Staff Member
  async function handleToggleStatus(membershipId: string, currentStatus: string, name: string) {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const actionLabel = newStatus === "SUSPENDED" ? "suspend" : "reactivate";

    if (!confirm(`Are you sure you want to ${actionLabel} ${name}'s access?`)) return;

    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, status: newStatus }),
      });

      if (res.ok) {
        showToast("success", `${name} has been ${newStatus.toLowerCase()}.`);
        loadStaffData();
        loadActivityLogs();
      } else {
        const j = await res.json();
        showToast("error", j.error || `Failed to ${actionLabel} staff`);
      }
    } catch {
      showToast("error", "Status update failed");
    }
  }

  // Remove Staff Member
  async function handleRemoveMember(membershipId: string, name: string) {
    if (!confirm(`Are you sure you want to permanently remove ${name} from this restaurant?`)) return;

    try {
      const res = await fetch(`/api/staff?membershipId=${membershipId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showToast("success", `${name} removed from restaurant team.`);
        loadStaffData();
        loadActivityLogs();
      } else {
        const j = await res.json();
        showToast("error", j.error || "Failed to remove staff member");
      }
    } catch {
      showToast("error", "Error removing staff member");
    }
  }

  // Resend Staff Invitation
  async function handleResendInvite(id: string, email: string) {
    setResendingId(id);
    try {
      const res = await fetch("/api/staff/invitations?action=resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        const j = await res.json();
        showToast("success", j.emailSent ? `Invite email resent to ${email}` : `Invite link refreshed for ${email}`);
        loadStaffData();
        loadActivityLogs();
      } else {
        const j = await res.json();
        showToast("error", j.error || "Failed to resend invitation");
      }
    } catch {
      showToast("error", "Error resending invitation");
    } finally {
      setResendingId(null);
    }
  }

  // Revoke Staff Invitation
  async function handleRevokeInvite(id: string, email: string) {
    if (!confirm(`Revoke pending invitation for ${email}?`)) return;

    try {
      const res = await fetch(`/api/staff/invitations?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showToast("success", `Invitation for ${email} revoked.`);
        loadStaffData();
        loadActivityLogs();
      } else {
        const j = await res.json();
        showToast("error", j.error || "Failed to revoke invitation");
      }
    } catch {
      showToast("error", "Error revoking invitation");
    }
  }

  const isOwnerOrManager = currentRole === "OWNER" || currentRole === "MANAGER" || currentRole === "HEAD_OFFICE";

  // Compute active on duty count from attendance
  const todayStr = new Date().toISOString().split("T")[0];
  const clockedInCount = attendanceRecords.filter((r) => r.date === todayStr && !r.checkOutTime).length;
  const openShiftsCount = shifts.filter((s) => s.status === "ACTIVE" && (s.cashierShiftId || s.openingPaise)).length;

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border p-3.5 shadow-xl transition-all ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          {toast.type === "success" ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 rounded p-1 hover:bg-black/5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#172B25]">
          Enterprise Staff & Team Management
        </h1>
        <p className="text-xs text-[#718078] mt-0.5">
          Comprehensive employee directory, role-based access control, shift schedules, daily timeclock, and audit trails.
        </p>
      </div>

      {/* KPI Metrics Summary Bar */}
      <StaffMetricsCards
        totalStaff={members.length}
        activeStaff={members.filter((m) => m.status === "ACTIVE").length}
        clockedInCount={clockedInCount}
        pendingInvitesCount={pendingInvitations.length}
        openShiftsCount={openShiftsCount}
        outletsCount={outlets.length}
      />

      {/* Navigation Tabs Bar */}
      <StaffTabsNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onInviteClick={() => setIsInviteModalOpen(true)}
        onScheduleShiftClick={() => setIsScheduleShiftModalOpen(true)}
        onCreateRoleClick={() => setIsCreateRoleModalOpen(true)}
        onExportClick={activeTab === "attendance" ? () => window.open(`/api/staff/attendance?export=true`, "_blank") : undefined}
        isOwnerOrManager={isOwnerOrManager}
      />

      {/* Active Tab View */}
      {activeTab === "directory" && (
        <StaffDirectoryTable
          members={members}
          pendingInvitations={pendingInvitations}
          outlets={outlets}
          currentUserId={currentUserId}
          currentRole={currentRole}
          onViewProfile={(m) => setSelectedProfileMember(m)}
          onEditMember={(m) => setSelectedEditMember(m)}
          onToggleStatus={handleToggleStatus}
          onRemoveMember={handleRemoveMember}
          onResendInvite={handleResendInvite}
          onRevokeInvite={handleRevokeInvite}
          resendingId={resendingId}
        />
      )}

      {activeTab === "shifts" && (
        <ShiftManagerView
          shifts={shifts}
          outlets={outlets}
          onRefresh={() => {
            loadShifts();
            loadActivityLogs();
          }}
          onOpenScheduleModal={() => setIsScheduleShiftModalOpen(true)}
          isOwnerOrManager={isOwnerOrManager}
        />
      )}

      {activeTab === "attendance" && (
        <AttendanceDashboard
          records={attendanceRecords}
          outlets={outlets}
          totalStaffCount={members.length}
          onRefresh={() => {
            loadAttendance();
            loadActivityLogs();
          }}
          onOpenRecordModal={() => setIsAttendanceModalOpen(true)}
          isOwnerOrManager={isOwnerOrManager}
        />
      )}

      {activeTab === "roles" && (
        <RolePermissionsMatrix
          systemRoles={systemRoles}
          customRoles={customRoles}
          onRoleCreated={() => {
            loadRoles();
            loadActivityLogs();
            showToast("success", "Custom staff role created successfully");
          }}
          isOwnerOrManager={isOwnerOrManager}
          isCreateModalOpen={isCreateRoleModalOpen}
          setIsCreateModalOpen={setIsCreateRoleModalOpen}
        />
      )}

      {activeTab === "activity" && (
        <StaffActivityLogsView
          logs={activityLogs}
          onRefresh={loadActivityLogs}
        />
      )}

      {/* Staff Profile Slide-over Drawer */}
      <StaffProfileDrawer
        member={selectedProfileMember}
        onClose={() => setSelectedProfileMember(null)}
        onEdit={(m) => {
          setSelectedProfileMember(null);
          setSelectedEditMember(m);
        }}
        isOwnerOrManager={isOwnerOrManager}
      />

      {/* Add / Invite Staff Modal */}
      <StaffInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        outlets={outlets}
        onInviteSuccess={() => {
          loadStaffData();
          loadActivityLogs();
          showToast("success", "Staff member processed successfully");
        }}
      />

      {/* Edit Staff Modal */}
      <StaffEditModal
        member={selectedEditMember}
        isOpen={!!selectedEditMember}
        onClose={() => setSelectedEditMember(null)}
        outlets={outlets}
        onSaveSuccess={() => {
          loadStaffData();
          loadActivityLogs();
          showToast("success", "Staff profile updated successfully");
        }}
      />

      {/* Schedule Shift Modal */}
      <ShiftModal
        isOpen={isScheduleShiftModalOpen}
        onClose={() => setIsScheduleShiftModalOpen(false)}
        members={members}
        outlets={outlets}
        onShiftCreated={() => {
          loadShifts();
          loadActivityLogs();
          showToast("success", "Shift scheduled successfully");
        }}
      />

      {/* Record Attendance Modal */}
      <AttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        members={members}
        outlets={outlets}
        onAttendanceLogged={() => {
          loadAttendance();
          loadActivityLogs();
          showToast("success", "Attendance punch recorded successfully");
        }}
      />
    </div>
  );
}
