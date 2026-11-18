"use client";

import React from "react";
import {
  Users,
  Clock,
  ShieldCheck,
  UserCheck,
  Award,
} from "lucide-react";
import { EnterpriseReportingPayload } from "@/lib/enterprise-reporting";

interface StaffAnalyticsTabProps {
  data: EnterpriseReportingPayload;
}

export function StaffAnalyticsTab({ data }: StaffAnalyticsTabProps) {
  const st = data.staffAnalytics;

  return (
    <div className="space-y-6">
      {/* 1. Shift & Working Hours Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#718078] uppercase">Completed Shifts</div>
          <div className="text-2xl font-black text-[#172B25] mt-1">{st.shiftsSummary.completedShifts}</div>
          <p className="text-[11px] text-[#718078] mt-0.5">Closed cashier/staff shifts</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-900 uppercase">Total Hours Worked</div>
          <div className="text-2xl font-black text-emerald-950 mt-1">
            {st.shiftsSummary.totalHoursWorked} hrs
          </div>
          <p className="text-[11px] text-emerald-700 mt-0.5">Across all scheduled rosters</p>
        </div>

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#718078] uppercase">Active Cashiers</div>
          <div className="text-2xl font-black text-[#172B25] mt-1">{st.cashiers.length}</div>
          <p className="text-[11px] text-[#718078] mt-0.5">Staff with billing activity</p>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-teal-900 uppercase">Cash Variance Status</div>
          <div className="text-2xl font-black text-teal-950 mt-1">Balanced</div>
          <p className="text-[11px] text-teal-700 mt-0.5">Reconciled at shift close</p>
        </div>
      </div>

      {/* 2. Cashier Billing Performance Table */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#16845B]" />
            <h3 className="text-sm font-black text-[#172B25]">
              Cashier & Server Billing Throughput ({st.cashiers.length})
            </h3>
          </div>
          <span className="text-[11px] font-bold text-[#718078]">
            Orders and revenue attributed to staff IDs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[10px] font-bold uppercase text-[#718078]">
              <tr>
                <th className="py-2.5 px-4">Staff Member</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3 text-center">Orders Processed</th>
                <th className="py-2.5 px-3 text-right">Revenue Billed</th>
                <th className="py-2.5 px-4 text-right">Average Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-[#172B25]">
              {st.cashiers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-[#718078]">
                    No cashier-attributed orders in this period.
                  </td>
                </tr>
              ) : (
                st.cashiers.map((c) => (
                  <tr key={c.staffId} className="hover:bg-[#F8FAF9] transition">
                    <td className="py-3 px-4 font-bold flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F5EE] text-[#16845B] text-[10px] font-black">
                        {c.name.charAt(0)}
                      </div>
                      <span>{c.name}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[9px] font-bold text-slate-700 uppercase">
                        {c.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-black">{c.ordersProcessed}</td>
                    <td className="py-3 px-3 text-right font-black">
                      ₹{Math.round(c.revenuePaise / 100).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#16845B]">
                      ₹{Math.round(c.aovPaise / 100).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Privacy & HR Policy Note */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-4 text-xs text-[#718078] space-y-1">
        <div className="font-extrabold text-[#172B25] flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-[#16845B]" /> Staff Analytics & Privacy Policy
        </div>
        <p className="leading-relaxed">
          Operational metrics are restricted to authorized owners and floor managers. RestroNex metrics are intended for workflow optimization and cash accountability, and must not be used as an automated disciplinary system.
        </p>
      </div>
    </div>
  );
}
