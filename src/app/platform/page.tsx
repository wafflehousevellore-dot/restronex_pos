export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/money";
import {
  Building2,
  CreditCard,
  Store,
  Activity,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Users,
  FileText,
  RotateCcw,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { calculatePlatformFinancialMetrics } from "@/lib/platform-revenue";

export default async function PlatformOverview() {
  const [metrics, recentTenants, recentPayments] = await Promise.all([
    calculatePlatformFinancialMetrics(),
    prisma.tenant.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        outlets: true,
      },
    }),
    prisma.subscriptionPayment.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        subscription: {
          include: {
            tenant: { select: { id: true, name: true, slug: true } },
            plan: { select: { name: true, slug: true } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8 text-[#172B25]">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5EE] text-[#16845B] border border-[#E5EBE7] mb-2">
          <ShieldCheck className="h-3.5 w-3.5 text-[#16845B]" />
          <span>RestroNex SaaS Operations &amp; Tenancy Control Center</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-[#172B25]">Platform Executive Intelligence</h1>
            <p className="text-sm text-[#718078]">
              Consolidated real-time SaaS subscription metrics derived directly from verified database records.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link
              href="/platform/revenue"
              className="rounded-full bg-[#16845B] text-white px-4 py-1.5 font-bold hover:bg-[#116B49] shadow-xs transition"
            >
              Revenue Analytics →
            </Link>
            <Link
              href="/platform/subscriptions"
              className="rounded-full border border-[#E5EBE7] bg-white px-4 py-1.5 font-semibold text-[#172B25] hover:bg-[#F8FAF9]"
            >
              Subscriptions
            </Link>
            <Link
              href="/platform/tenants"
              className="rounded-full border border-[#E5EBE7] bg-white px-4 py-1.5 font-semibold text-[#172B25] hover:bg-[#F8FAF9]"
            >
              Organizations
            </Link>
            <Link
              href="/platform/audit-logs"
              className="rounded-full border border-[#E5EBE7] bg-white px-4 py-1.5 font-semibold text-[#172B25] hover:bg-[#F8FAF9]"
            >
              Security Audit
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid: Section 6 Requirements */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total & Active Businesses */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078] flex items-center justify-between">
              <span>Registered Businesses</span>
              <Building2 className="h-4 w-4 text-[#16845B]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-[#172B25]">{metrics.totalRegisteredBusinesses}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#718078]">
              <span className="font-semibold text-[#16845B]">{metrics.activeBusinesses} Active</span>
              <span>•</span>
              <span className="text-[#D97706]">{metrics.suspendedBusinesses} Suspended</span>
            </div>
            <p className="mt-1 text-[11px] text-[#718078]">
              Total onboarded tenant organizations in platform database.
            </p>
          </CardContent>
        </Card>

        {/* Active Subscriptions & Distribution */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078] flex items-center justify-between">
              <span>Active Subscriptions</span>
              <CheckCircle2 className="h-4 w-4 text-[#16845B]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-[#16845B]">{metrics.activeSubscriptions}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#718078]">
              <span>{metrics.pastDueSubscriptions} Past-Due</span>
              <span>•</span>
              <span className="text-red-600">{metrics.expiredSubscriptions} Expired</span>
              <span>•</span>
              <span>{metrics.cancelledSubscriptions} Cancelled</span>
            </div>
            <p className="mt-1 text-[11px] text-[#718078]">
              Paid active restaurant contracts granting full terminal access.
            </p>
          </CardContent>
        </Card>

        {/* Monthly Recurring Revenue (MRR) */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078] flex items-center justify-between">
              <span>Monthly Recurring Revenue</span>
              <TrendingUp className="h-4 w-4 text-[#16845B]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-[#172B25]">{formatINR(metrics.mrrPaise)}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#718078]">
              <span>ARR Run-Rate:</span>
              <span className="font-bold text-[#172B25]">{formatINR(metrics.arrPaise)}</span>
            </div>
            <p className="mt-1 text-[11px] text-[#718078]">
              Strict MRR from active recurring contracts (Annual plan normalized to 1/12th).
            </p>
          </CardContent>
        </Card>

        {/* Active Outlets */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078] flex items-center justify-between">
              <span>Active Outlets</span>
              <Store className="h-4 w-4 text-[#16845B]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-[#172B25]">{metrics.activeOutlets}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#718078]">
              <span>Total Registered:</span>
              <span className="font-semibold text-[#172B25]">{metrics.totalOutlets}</span>
            </div>
            <p className="mt-1 text-[11px] text-[#718078]">
              Live restaurant branches across all active organizations.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Operational Metrics Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Payment Success Rate */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#718078]">Payment Success</span>
              <CreditCard className="h-4 w-4 text-[#16845B]" />
            </div>
            <div className="mt-2 text-2xl font-black text-[#172B25]">{metrics.paymentSuccessRatePct}%</div>
            <p className="mt-1 text-xs text-[#718078]">
              {metrics.successfulPaymentsCount} successful / {metrics.totalPaymentAttempts} total attempts
            </p>
          </CardContent>
        </Card>

        {/* Payment Failure Rate */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#718078]">Payment Failure</span>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-red-600">{metrics.paymentFailureRatePct}%</div>
            <p className="mt-1 text-xs text-[#718078]">
              {metrics.failedPaymentsCount} payment failures logged via webhooks
            </p>
          </CardContent>
        </Card>

        {/* Monthly Churn Rate */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#718078]">Monthly Churn</span>
              <RotateCcw className="h-4 w-4 text-[#718078]" />
            </div>
            <div className="mt-2 text-2xl font-black text-[#172B25]">{metrics.monthlyChurnRatePct}%</div>
            <p className="mt-1 text-xs text-[#718078]">
              {metrics.monthlyChurnCount} cancellations / expirations in last 30d
            </p>
          </CardContent>
        </Card>

        {/* Total SaaS Revenue & Refunds */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#718078]">Total SaaS Collections</span>
              <Activity className="h-4 w-4 text-[#16845B]" />
            </div>
            <div className="mt-2 text-2xl font-black text-[#16845B]">
              {formatINR(metrics.totalSaaSSubscriptionRevenuePaise)}
            </div>
            <p className="mt-1 text-xs text-[#718078]">
              Refunds: {formatINR(metrics.totalRefundAmountPaise)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution Breakdown */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="pb-3 border-b border-[#E5EBE7]">
          <CardTitle className="text-sm font-black text-[#172B25] flex items-center justify-between">
            <span>Subscription Plan Distribution &amp; MRR Contribution</span>
            <span className="text-xs font-normal text-[#718078]">Active paid subscriptions only</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(metrics.planDistribution).map(([slug, p]) => (
              <div key={slug} className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#172B25]">{p.name}</span>
                  <span className="rounded-full bg-[#E8F5EE] text-[#16845B] border border-[#E5EBE7] px-2.5 py-0.5 text-xs font-bold">
                    {p.count} Active
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-xs text-[#718078]">Monthly Revenue Contribution</div>
                  <div className="text-lg font-black text-[#16845B]">{formatINR(p.mrrPaise)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Organizations & Payments Split */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Organizations */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5EBE7] flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black text-[#172B25] flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#16845B]" />
              <span>Recently Registered Organizations</span>
            </CardTitle>
            <Link href="/platform/tenants" className="text-xs font-bold text-[#16845B] hover:underline">
              View All ({metrics.totalRegisteredBusinesses}) →
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {recentTenants.length === 0 ? (
              <p className="text-xs text-[#718078] py-4 text-center">No organizations registered yet.</p>
            ) : (
              <div className="divide-y divide-[#E5EBE7] text-xs">
                {recentTenants.map((t) => {
                  const sub = t.subscriptions[0];
                  return (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-[#172B25]">{t.name}</div>
                        <div className="text-[11px] text-[#718078]">
                          {t.email} • {t.outlets.length} outlet(s)
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            sub?.status === "ACTIVE"
                              ? "bg-[#E8F5EE] text-[#16845B]"
                              : "bg-[#F8FAF9] text-[#718078] border border-[#E5EBE7]"
                          }`}
                        >
                          {sub?.plan?.name || "No Plan"} • {sub?.status || "PENDING"}
                        </span>
                        <div className="text-[10px] text-[#718078] mt-1">
                          {new Date(t.createdAt).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent SaaS Payments */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E5EBE7] flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black text-[#172B25] flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#16845B]" />
              <span>Recent SaaS Subscription Payments</span>
            </CardTitle>
            <Link href="/platform/payments" className="text-xs font-bold text-[#16845B] hover:underline">
              Payments Ledger →
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {recentPayments.length === 0 ? (
              <p className="text-xs text-[#718078] py-4 text-center">No subscription payments logged yet.</p>
            ) : (
              <div className="divide-y divide-[#E5EBE7] text-xs">
                {recentPayments.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-[#172B25]">
                        {p.subscription.tenant.name}
                      </div>
                      <div className="text-[11px] text-[#718078]">
                        {p.subscription.plan.name} • Ref: {p.providerPaymentId?.slice(0, 16) || p.id.slice(0, 12)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-[#172B25]">{formatINR(p.amountPaise)}</div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          p.status === "COMPLETED"
                            ? "bg-[#E8F5EE] text-[#16845B]"
                            : p.status === "REFUNDED"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
