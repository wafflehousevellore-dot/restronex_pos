"use client";

import React from "react";
import { Users, Clock, CheckCircle2, ShieldCheck, AlertCircle, Building2 } from "lucide-react";

interface StaffMetricsProps {
  totalStaff: number;
  activeStaff: number;
  clockedInCount: number;
  pendingInvitesCount: number;
  openShiftsCount: number;
  outletsCount: number;
}

export function StaffMetricsCards({
  totalStaff,
  activeStaff,
  clockedInCount,
  pendingInvitesCount,
  openShiftsCount,
  outletsCount,
}: StaffMetricsProps) {
  const attendanceRate = totalStaff > 0 ? Math.round((clockedInCount / totalStaff) * 100) : 0;

  const cards = [
    {
      title: "Total Staff Roster",
      value: totalStaff,
      subtext: `${activeStaff} active • ${totalStaff - activeStaff} inactive`,
      icon: Users,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      title: "Clocked In / On Duty",
      value: clockedInCount,
      subtext: `${attendanceRate}% current attendance rate`,
      icon: Clock,
      color: "text-teal-700 bg-teal-50 border-teal-200",
    },
    {
      title: "Active Cashier Registers",
      value: openShiftsCount,
      subtext: openShiftsCount > 0 ? "Registers balanced & live" : "No open shift registers",
      icon: CheckCircle2,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      title: "Pending Invitations",
      value: pendingInvitesCount,
      subtext: pendingInvitesCount > 0 ? "Awaiting employee acceptance" : "All staff onboarded",
      icon: AlertCircle,
      color: pendingInvitesCount > 0 ? "text-indigo-700 bg-indigo-50 border-indigo-200" : "text-gray-700 bg-gray-50 border-gray-200",
    },
    {
      title: "Outlet Coverage",
      value: `${outletsCount} Outlets`,
      subtext: "Multi-branch permissions active",
      icon: Building2,
      color: "text-sky-700 bg-sky-50 border-sky-200",
    },
    {
      title: "Security & RBAC",
      value: "Enforced",
      subtext: "Server-side tenant isolation",
      icon: ShieldCheck,
      color: "text-purple-700 bg-purple-50 border-purple-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-xl border border-[#E5EBE7] bg-white p-4 shadow-xs transition hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#718078] truncate">{c.title}</span>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${c.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold tracking-tight text-[#172B25]">{c.value}</div>
              <div className="mt-1 text-[11px] text-[#718078] truncate">{c.subtext}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
