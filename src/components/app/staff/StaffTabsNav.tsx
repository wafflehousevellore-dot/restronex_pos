"use client";

import React from "react";
import {
  Users,
  CalendarDays,
  Clock,
  ShieldCheck,
  History,
  UserPlus,
  CalendarPlus,
  Plus,
  Download,
} from "lucide-react";

export type StaffTabMode = "directory" | "shifts" | "attendance" | "roles" | "activity";

interface StaffTabsNavProps {
  activeTab: StaffTabMode;
  onTabChange: (tab: StaffTabMode) => void;
  onInviteClick: () => void;
  onScheduleShiftClick: () => void;
  onCreateRoleClick: () => void;
  onExportClick?: () => void;
  isOwnerOrManager: boolean;
}

export function StaffTabsNav({
  activeTab,
  onTabChange,
  onInviteClick,
  onScheduleShiftClick,
  onCreateRoleClick,
  onExportClick,
  isOwnerOrManager,
}: StaffTabsNavProps) {
  const tabs = [
    { id: "directory" as StaffTabMode, label: "Staff Directory", icon: Users },
    { id: "shifts" as StaffTabMode, label: "Shifts & Cash Drawer", icon: CalendarDays },
    { id: "attendance" as StaffTabMode, label: "Attendance & Timeclock", icon: Clock },
    { id: "roles" as StaffTabMode, label: "Roles & Permissions", icon: ShieldCheck },
    { id: "activity" as StaffTabMode, label: "Staff Activity Trail", icon: History },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5EBE7] pb-3">
      {/* Tab Navigation Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-[#16845B] text-white shadow-xs"
                  : "bg-white text-[#55655D] border border-[#E5EBE7] hover:bg-[#F2F5F3] hover:text-[#172B25]"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#718078]"}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {onExportClick && (
          <button
            onClick={onExportClick}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] bg-white px-3 py-2 text-xs font-semibold text-[#172B25] shadow-xs hover:bg-[#F2F5F3]"
            title="Download CSV"
          >
            <Download className="h-3.5 w-3.5 text-[#718078]" />
            <span>Export CSV</span>
          </button>
        )}

        {isOwnerOrManager && activeTab === "roles" && (
          <button
            onClick={onCreateRoleClick}
            className="flex items-center gap-1.5 rounded-lg border border-[#E5EBE7] bg-white px-3 py-2 text-xs font-semibold text-[#172B25] shadow-xs hover:bg-[#F2F5F3]"
          >
            <Plus className="h-3.5 w-3.5 text-[#16845B]" />
            <span>New Custom Role</span>
          </button>
        )}

        {isOwnerOrManager && activeTab === "shifts" && (
          <button
            onClick={onScheduleShiftClick}
            className="flex items-center gap-1.5 rounded-lg bg-[#16845B] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] transition"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span>Schedule Shift</span>
          </button>
        )}

        {isOwnerOrManager && (
          <button
            onClick={onInviteClick}
            className="flex items-center gap-1.5 rounded-lg bg-[#16845B] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#116B49] transition"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>+ Add / Invite Staff</span>
          </button>
        )}
      </div>
    </div>
  );
}
