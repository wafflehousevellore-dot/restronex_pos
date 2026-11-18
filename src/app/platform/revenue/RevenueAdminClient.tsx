"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/money";
import { PlatformFinancialMetrics } from "@/lib/platform-revenue";
import {
  TrendingUp,
  CreditCard,
  Building2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import Link from "next/link";

export default function RevenueAdminClient({
  initialMetrics,
}: {
  initialMetrics: PlatformFinancialMetrics;
}) {
  const [metrics] = useState<PlatformFinancialMetrics>(initialMetrics);

  // Documented Customer Lifetime Value (CLV): ARPU / Churn Rate
  const arpuPaise =
    metrics.activeSubscriptions > 0
      ? Math.round(metrics.mrrPaise / metrics.activeSubscriptions)
      : 0;

  const churnRateDecimal = Math.max(0.01, metrics.monthlyChurnRatePct / 100);
  const clvPaise = Math.round(arpuPaise / churnRateDecimal);

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#172B25]">Platform SaaS Revenue &amp; Financial Analytics</h1>
          <p className="text-sm text-[#718078]">
            SaaS subscription recurring revenue, MRR/ARR trajectories, churn rates, and Customer Lifetime Value (CLV).
          </p>
        </div>
        <Link
          href="/platform/payments"
          className="rounded-full bg-[#16845B] text-white px-4 py-1.5 text-xs font-bold hover:bg-[#116B49] shadow-xs transition"
        >
          View Payments Ledger →
        </Link>
      </div>

      {/* Primary Financial KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078] flex items-center justify-between">
              <span>Monthly Recurring Revenue</span>
              <TrendingUp className="h-4 w-4 text-[#16845B]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-[#16845B]">{formatINR(metrics.mrrPaise)}</div>
            <p className="mt-2 text-xs text-[#718078]">
              Contractual MRR from {metrics.activeSubscriptions} active recurring subscriptions.
            </p>
          </CardContent>
        </Card>

        {/* ARR */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078] flex items-center justify-between">
              <span>Annual Run-Rate (ARR)</span>
              <TrendingUp className="h-4 w-4 text-[#16845B]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-[#172B25]">{formatINR(metrics.arrPaise)}</div>
            <p className="mt-2 text-xs text-[#718078]">
              Run-rate projection (MRR × 12). Does not represent guaranteed future revenue.
            </p>
          </CardContent>
        </Card>

        {/* Total Historical SaaS Collections */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078] flex items-center justify-between">
              <span>Total SaaS Revenue</span>
              <CreditCard className="h-4 w-4 text-[#16845B]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-[#172B25]">
              {formatINR(metrics.totalSaaSSubscriptionRevenuePaise)}
            </div>
            <p className="mt-2 text-xs text-[#718078]">
              Total cumulative payments captured via Razorpay checkout and renewals.
            </p>
          </CardContent>
        </Card>

        {/* Estimated CLV */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078] flex items-center justify-between">
              <span>Customer Lifetime Value</span>
              <Info className="h-4 w-4 text-[#16845B]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-[#172B25]">{formatINR(clvPaise)}</div>
            <p className="mt-2 text-xs text-[#718078]">
              Calculated as ARPU ({formatINR(arpuPaise)}) ÷ Monthly Churn ({metrics.monthlyChurnRatePct}%).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Contribution Matrix */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5EBE7]">
          <CardTitle className="text-sm font-black text-[#172B25] flex items-center justify-between">
            <span>SaaS Revenue by Subscription Tier</span>
            <span className="text-xs font-normal text-[#718078]">Based on current active subscriptions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(metrics.planDistribution).map(([slug, plan]) => {
              const pct = metrics.mrrPaise > 0 ? ((plan.mrrPaise / metrics.mrrPaise) * 100).toFixed(1) : 0;
              return (
                <div key={slug} className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#172B25]">{plan.name}</span>
                    <span className="rounded-full bg-[#E8F5EE] text-[#16845B] border border-[#E5EBE7] px-2 py-0.5 text-xs font-bold">
                      {plan.count} Subscribers
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-[#718078]">Monthly Recurring Revenue</div>
                    <div className="text-xl font-black text-[#16845B]">{formatINR(plan.mrrPaise)}</div>
                  </div>
                  <div className="w-full bg-[#E5EBE7] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#16845B] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[11px] text-[#718078]">{pct}% of total platform MRR</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cohort & Gateway Health Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Growth & Retention */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">
              30-Day Customer Growth
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#718078]">New Restaurant Customers:</span>
              <strong className="text-[#16845B] font-bold text-sm">+{metrics.monthlyNewCustomers}</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#718078]">Churned Subscriptions:</span>
              <strong className="text-red-600 font-bold text-sm">-{metrics.monthlyChurnCount}</strong>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-[#E5EBE7] pt-2">
              <span className="text-[#718078]">Net Monthly Subscriber Gain:</span>
              <strong className="font-black text-sm text-[#172B25]">
                {metrics.monthlyNewCustomers - metrics.monthlyChurnCount}
              </strong>
            </div>
          </CardContent>
        </Card>

        {/* Payment Success vs Failures */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">
              Gateway Reliability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#718078]">Success Rate:</span>
              <strong className="text-[#16845B] font-bold text-sm">{metrics.paymentSuccessRatePct}%</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#718078]">Failure Rate:</span>
              <strong className="text-red-600 font-bold text-sm">{metrics.paymentFailureRatePct}%</strong>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-[#E5EBE7] pt-2">
              <span className="text-[#718078]">Total Payment Attempts:</span>
              <strong className="font-black text-sm text-[#172B25]">{metrics.totalPaymentAttempts}</strong>
            </div>
          </CardContent>
        </Card>

        {/* Contract Retention */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">
              Contract Retention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#718078]">Subscription Renewal Rate:</span>
              <strong className="text-[#16845B] font-bold text-sm">{metrics.renewalRatePct}%</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#718078]">Past-Due in Grace Period:</span>
              <strong className="text-[#D97706] font-bold text-sm">{metrics.pastDueSubscriptions}</strong>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-[#E5EBE7] pt-2">
              <span className="text-[#718078]">Total Refund Outflow:</span>
              <strong className="font-black text-sm text-amber-700">
                {formatINR(metrics.totalRefundAmountPaise)}
              </strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
