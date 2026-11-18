"use client";

import React from "react";
import {
  HeartHandshake,
  Users,
  Coins,
  TrendingUp,
  Award,
  ShieldCheck,
} from "lucide-react";
import { EnterpriseReportingPayload } from "@/lib/enterprise-reporting";

interface CustomerAnalyticsTabProps {
  data: EnterpriseReportingPayload;
}

export function CustomerAnalyticsTab({ data }: CustomerAnalyticsTabProps) {
  const ca = data.customerAnalytics;
  const ex = data.executiveSummary;

  return (
    <div className="space-y-6">
      {/* 1. Customer KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-indigo-900 uppercase">Customer Lifetime Value (CLV)</div>
          <div className="text-2xl font-black text-indigo-950 mt-1">
            ₹{Math.round(ca.clvPaise / 100).toLocaleString()}
          </div>
          <p className="text-[11px] text-indigo-700 mt-0.5">Average revenue per diner profile</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-900 uppercase">Repeat Diner Rate</div>
          <div className="text-2xl font-black text-emerald-950 mt-1">{ca.repeatRatePct}%</div>
          <p className="text-[11px] text-emerald-700 mt-0.5">
            {ca.returningCustomers} multi-visit customers
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-amber-900 uppercase">Loyalty Points in Circulation</div>
          <div className="text-2xl font-black text-amber-950 mt-1">
            {ca.loyaltyBalanceTotal.toLocaleString()} <span className="text-xs font-bold">pts</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Worth ₹{ca.loyaltyBalanceTotal.toLocaleString()} in diner store credit
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#718078] uppercase">Registered Customer Base</div>
          <div className="text-2xl font-black text-[#172B25] mt-1">{ca.totalCustomers}</div>
          <p className="text-[11px] text-[#718078] mt-0.5">
            {ca.newCustomers} first-time diners
          </p>
        </div>
      </div>

      {/* 2. Points Earn vs Burn in Selected Period */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25] flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-emerald-600" /> Points Issued in Period
          </h3>
          <div className="text-2xl font-black text-emerald-800">
            +{ca.pointsIssuedPeriod.toLocaleString()} pts
          </div>
          <p className="text-xs text-[#718078] leading-relaxed">
            Points automatically awarded on paid POS and online bills according to tenant earning rules.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#172B25] flex items-center gap-1.5">
            <Award className="h-4 w-4 text-amber-600" /> Points Redeemed in Period
          </h3>
          <div className="text-2xl font-black text-amber-800">
            -{ca.pointsRedeemedPeriod.toLocaleString()} pts
          </div>
          <p className="text-xs text-[#718078] leading-relaxed">
            Redeemed by diners at POS cashier checkout for instant bill discounts.
          </p>
        </div>
      </div>

      {/* 3. Consent & Data Protection Notice */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-4 text-xs text-[#718078] space-y-1">
        <div className="font-extrabold text-[#172B25] flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-[#16845B]" /> Customer Data Privacy & Consent Guarantee
        </div>
        <p className="leading-relaxed">
          Customer analytics strictly respect diner privacy. Detailed phone numbers and email addresses are masked in aggregate reporting views to prevent unauthorized exposure.
        </p>
      </div>
    </div>
  );
}
