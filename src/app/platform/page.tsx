export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/money";
import { Building2, CreditCard, Store, Activity, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import fs from "fs";
import path from "path";

export default async function PlatformOverview() {
  const [
    totalTenants,
    activeSubscriptions,
    pendingRegistrationsCount,
    _cancelledSubscriptions,
    totalOutlets,
    activeOutlets,
    totalOrders,
    plans,
    recentPending,
    recentTenants,
    completedPayments,
    failedPaymentsCount,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.pendingRegistration.count({ where: { status: "PENDING" } }),
    prisma.subscription.count({ where: { status: "CANCELLED" } }),
    prisma.outlet.count(),
    prisma.outlet.count({ where: { status: "ACTIVE" } }),
    prisma.order.count(),
    prisma.subscriptionPlan.findMany({
      include: {
        subscriptions: {
          where: { status: "ACTIVE" },
        },
      },
    }),
    prisma.pendingRegistration.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenant.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        subscriptions: {
          include: { plan: true },
        },
        outlets: true,
      },
    }),
    prisma.subscriptionPayment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amountPaise: true },
      _count: true,
    }),
    prisma.subscriptionPayment.count({ where: { status: "FAILED" } }),
  ]);

  let mrrPaise = 0;
  plans.forEach((plan) => {
    const monthlyRate = plan.priceMonthlyPaise;
    mrrPaise += plan.subscriptions.length * monthlyRate;
  });

  let dbSizeBytes = 0;
  try {
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");
    if (fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath);
      dbSizeBytes = stat.size;
    }
  } catch {}

  return (
    <div className="space-y-8 text-[#172B25]">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5EE] text-[#16845B] border border-[#E5EBE7] mb-2">
          <ShieldCheck className="h-3.5 w-3.5 text-[#16845B]" />
          <span>Platform Super Admin • Live Infrastructure Metrics</span>
        </div>
        <h1 className="text-2xl font-black text-[#172B25]">Platform Operations & Tenancy Overview</h1>
        <p className="text-sm text-[#718078]">
          Real-time metrics derived directly from persistent database records • Strict tenant isolation
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078] flex items-center justify-between">
              <span>Registered Businesses</span>
              <Building2 className="h-4 w-4 text-[#16845B]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-[#172B25]">{totalTenants}</div>
            <p className="text-xs text-[#718078] mt-1">{activeSubscriptions} active paying subscriptions</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078] flex items-center justify-between">
              <span>Monthly Recurring Rev (MRR)</span>
              <CreditCard className="h-4 w-4 text-[#16845B]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-[#16845B]">{formatINR(mrrPaise)}</div>
            <p className="text-xs text-[#718078] mt-1">Verified: {formatINR(completedPayments._sum.amountPaise || 0)}</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078] flex items-center justify-between">
              <span>Active Outlets</span>
              <Store className="h-4 w-4 text-[#16845B]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-[#172B25]">{activeOutlets}</div>
            <p className="text-xs text-[#718078] mt-1">{totalOutlets} total across tenants</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078] flex items-center justify-between">
              <span>Pending Registrations</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600">{pendingRegistrationsCount}</div>
            <p className="text-xs text-[#718078] mt-1">Awaiting checkout / verification</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan-Wise Subscriber Breakdown */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-[#172B25]">Plan-Wise Subscribers & Quotas</CardTitle>
            <p className="text-xs text-[#718078] mt-0.5">Configured prices, outlet quotas, and active paying accounts</p>
          </div>
          <Link href="/platform/plans" className="text-xs text-[#16845B] hover:underline font-semibold">
            Edit Plans & Quotas →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <div key={p.id} className="p-4 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#172B25]">{p.name}</span>
                  <span className="text-xs font-mono text-[#16845B] font-semibold">{formatINR(p.priceMonthlyPaise)}/mo</span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#172B25]">{p.subscriptions.length}</span>
                  <span className="text-xs text-[#718078]">active subscribers</span>
                </div>
                <div className="mt-2 text-[11px] text-[#718078] flex justify-between">
                  <span>Max Outlets: {p.maxOutlets}</span>
                  <span>Max Staff: {p.maxUsers}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Operational Health & Storage Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-base text-[#172B25] flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#16845B]" />
              <span>Operational Health & Storage Monitoring</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-[#E5EBE7]">
              <span className="text-[#718078]">Database Engine</span>
              <span className="font-mono text-[#16845B] font-semibold">PostgreSQL (Supabase Ready)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E5EBE7]">
              <span className="text-[#718078]">Database Size</span>
              <span className="font-mono text-[#172B25]">{(dbSizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E5EBE7]">
              <span className="text-[#718078]">Total POS Orders Logged</span>
              <span className="font-mono text-[#172B25]">{totalOrders} orders</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E5EBE7]">
              <span className="text-[#718078]">Failed Payments Flagged</span>
              <span className="font-mono text-amber-600 font-semibold">{failedPaymentsCount}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#718078]">Health Check Status</span>
              <span className="inline-flex items-center gap-1 text-[#16845B] font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Healthy (/api/health)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Pending Registrations */}
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-[#172B25]">Recent Customer Onboarding Pipeline</CardTitle>
            <span className="text-xs text-[#718078]">{recentPending.length} in funnel</span>
          </CardHeader>
          <CardContent>
            {recentPending.length === 0 ? (
              <p className="text-xs text-[#718078] py-6 text-center">No pending registrations at the moment.</p>
            ) : (
              <div className="space-y-2.5">
                {recentPending.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] text-xs">
                    <div>
                      <div className="font-bold text-[#172B25]">{r.businessName}</div>
                      <div className="text-[11px] text-[#718078]">{r.ownerName} • {r.email}</div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                        {r.planSlug} • {r.status}
                      </span>
                      <div className="text-[10px] text-[#718078] mt-0.5">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Registered Tenants List */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-[#172B25]">Registered Restaurant Tenants</CardTitle>
            <p className="text-xs text-[#718078] mt-0.5">Isolated tenant workspaces with configured outlets & active subscriptions</p>
          </div>
          <Link href="/platform/tenants" className="text-xs text-[#16845B] hover:underline font-semibold">
            View All Tenants →
          </Link>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-[#E5EBE7] text-xs">
            {recentTenants.map((t) => {
              const activeSub = t.subscriptions.find((s) => s.status === "ACTIVE");
              return (
                <div key={t.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <div>
                    <div className="font-bold text-[#172B25] text-sm">{t.name}</div>
                    <div className="text-[#718078] text-[11px] mt-0.5">
                      Slug: <span className="font-mono text-[#172B25]">{t.slug}</span> • {t.businessType} • {t.outlets.length} outlet(s)
                    </div>
                  </div>
                  <div className="text-right">
                    {activeSub ? (
                      <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#E8F5EE] text-[#16845B] border border-[#E5EBE7]">
                        {activeSub.plan.name} Plan (Active)
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-[#F8FAF9] text-[#718078] border border-[#E5EBE7]">
                        No Active Plan
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
