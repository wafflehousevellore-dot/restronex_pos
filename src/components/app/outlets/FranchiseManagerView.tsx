"use client";

import React from "react";
import { formatINR } from "@/lib/money";
import { 
  Handshake, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Users, 
  Award, 
  FileCheck,
  TrendingUp 
} from "lucide-react";

interface FranchiseManagerViewProps {
  outlets: any[];
}

export function FranchiseManagerView({ outlets }: FranchiseManagerViewProps) {
  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-br from-[#172B25] to-[#126b49] text-white p-6 rounded-3xl shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-widest text-emerald-300">
            Chain & Franchise Governance
          </span>
        </div>
        <h2 className="text-xl font-black">
          Head Office Quality Standards & Brand Compliance
        </h2>
        <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
          Ensure unified customer experience across all branch locations. Manage franchisee partner compliance, enforce master recipe costing, centralize billing configurations, and track royalty contributions in real-time.
        </p>
      </div>

      {/* Franchise Standards Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-[#E5EBE7] shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5 text-[#16845B]" />
            <span className="text-xs font-black">Master Menu Sync</span>
          </div>
          <p className="text-[11px] text-[#718078]">
            Base items, variants and modifiers locked to Head Office specifications.
          </p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E5EBE7] shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5 text-[#16845B]" />
            <span className="text-xs font-black">Recipe BOM Control</span>
          </div>
          <p className="text-[11px] text-[#718078]">
            Strict portion control and ingredient deduction per sales ticket.
          </p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E5EBE7] shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5 text-[#16845B]" />
            <span className="text-xs font-black">Tax & GST Invoicing</span>
          </div>
          <p className="text-[11px] text-[#718078]">
            Automated tax calculation, invoice series numbering and digital receipting.
          </p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-[#E5EBE7] shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5 text-[#16845B]" />
            <span className="text-xs font-black">Audited Stock Moves</span>
          </div>
          <p className="text-[11px] text-[#718078]">
            Immutable movement history for inter-branch transfers and kitchen wastage.
          </p>
        </div>
      </div>

      {/* Franchise Outlets Directory */}
      <div className="bg-white rounded-3xl border border-[#E5EBE7] overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E5EBE7] bg-[#F4F6F5] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-[#172B25]">
              Branch Operational Profiles & Governance
            </h3>
            <p className="text-xs text-[#718078]">
              Operating model, manager assignment, and sales contribution
            </p>
          </div>
          <span className="text-xs font-bold text-[#16845B] bg-emerald-100 px-3 py-1 rounded-full">
            {outlets.length} Governed Outlets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F6F5] border-b border-[#E5EBE7] text-[#718078] uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="py-3 px-4">Branch Location</th>
                <th className="py-3 px-4">Operating Model</th>
                <th className="py-3 px-4">Service Standards</th>
                <th className="py-3 px-4">Sales Performance</th>
                <th className="py-3 px-4">Staff Members</th>
                <th className="py-3 px-4 text-right">Brand Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7]">
              {outlets.map((outlet, idx) => {
                const isCompanyOwned = idx === 0;

                return (
                  <tr key={outlet.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-[#172B25] text-sm">{outlet.name}</div>
                      <div className="text-[11px] text-[#718078]">{outlet.city || "Bengaluru"}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isCompanyOwned
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {isCompanyOwned ? "Company Flagship" : "Franchise Partner"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs font-semibold text-[#172B25]">
                        {outlet.openingHours || "11:00 AM - 11:00 PM"}
                      </div>
                      <div className="text-[11px] text-[#718078]">
                        {outlet.serviceModes || "Dine-in, Takeaway"}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-black text-[#16845B] text-sm">
                        {formatINR(outlet.revenuePaise || 0)}
                      </div>
                      <div className="text-[11px] text-[#718078]">
                        {outlet.orderCount || 0} customer orders
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-[#172B25]">
                      {outlet.staffCount || 0} assigned
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <ShieldCheck className="h-3 w-3" />
                        Verified
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
