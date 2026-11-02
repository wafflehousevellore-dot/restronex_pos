export const dynamic = "force-dynamic";
import { getSession, getActiveOrgId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/money";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getEntitlements } from "@/lib/entitlements";

export default async function Dashboard(){
  const { userId } = await getSession();
  if (!userId) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-8 text-center shadow-sm">
          <div className="text-xl font-bold text-[#172B25]">Please sign in</div>
          <div className="text-sm text-[#718078] mt-1">Your session expired. Sign in to view your dashboard.</div>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/sign-in" className="rounded-full bg-[#16845B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#116B49] shadow-xs">Sign In</Link>
            <Link href="/sign-up" className="rounded-full border border-[#E5EBE7] bg-white px-6 py-2.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9]">Create Account</Link>
          </div>
        </div>
      </div>
    );
  }
  let tenantId = await getActiveOrgId();
  if(!tenantId){
    const mem = await prisma.membership.findFirst({ where:{ userId }});
    tenantId = mem?.tenantId || null;
  }
  if(!tenantId){
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="p-8 text-center bg-white border-[#E5EBE7] shadow-sm">
          <div className="text-xl font-bold text-[#172B25]">No restaurant business found</div>
          <div className="text-sm text-[#718078] mt-1">Create your restaurant business to continue.</div>
          <Link href="/app/organization" className="mt-6 inline-block rounded-full bg-[#16845B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#116B49] shadow-xs">Create organization →</Link>
        </Card>
        <div className="rounded-xl bg-white border border-[#E5EBE7] p-4 text-xs text-[#718078] text-center">
          After auth, select or create your organization. Your selected subscription plan is preserved.
        </div>
      </div>
    );
  }
  const tenant = await prisma.tenant.findUnique({ where:{ id: tenantId }, include:{ outlets:true }});
  if (!tenant) redirect("/app/organization");
  if (!tenant.onboardingComplete) {
    const stepNames = ["Business","Outlet","Tables","Menu","Tax","Staff","Plan","Launch"];
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="p-6 bg-white border-[#E5EBE7] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-bold text-[#172B25]">Onboarding in progress</div>
              <div className="text-xs text-[#718078] mt-0.5">Step {tenant.onboardingStep+1} of 8 - {stepNames[tenant.onboardingStep]} • Progress is saved</div>
            </div>
            <Link href="/app/onboarding" className="rounded-full bg-[#16845B] px-5 py-2 text-sm font-bold text-white hover:bg-[#116B49] shadow-xs">Continue onboarding →</Link>
          </div>
          <div className="mt-5 grid grid-cols-8 gap-1.5">
            {Array.from({length:8}).map((_,i)=> (
              <div key={i} className={`h-2 rounded-full ${i<tenant.onboardingStep ? "bg-[#16845B]" : i===tenant.onboardingStep ? "bg-[#16845B]/60" : "bg-[#E5EBE7]"}`} />
            ))}
          </div>
          <div className="mt-3 text-xs text-[#718078]">Complete all 8 steps to launch your full restaurant workspace.</div>
        </Card>
      </div>
    );
  }

  const ent = await getEntitlements(tenantId);
  const orders = await prisma.order.findMany({ where:{ tenantId }});
  const totalSales = orders.reduce((s,o)=>s+o.totalPaise,0);
  const todayOrders = orders.filter(o=> new Date(o.createdAt).toDateString()===new Date().toDateString());
  const customers = await prisma.customer.count({ where:{ tenantId }});
  const tables = await prisma.table.count({ where:{ tenantId, status:"OCCUPIED"}});
  const memCount = await prisma.membership.count({ where:{ tenantId }});
  const salesByOutlet = await prisma.order.groupBy({ by:["outletId"], where:{ tenantId }, _sum:{ totalPaise:true }, _count:true });
  const outlets = await prisma.outlet.findMany({ where:{ tenantId }});
  const outletMap = Object.fromEntries(outlets.map(o=>[o.id,o.name]));

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Dashboard</h1>
          <p className="text-sm text-[#718078]">{tenant.name} • {tenant.businessType} • {tenant.slug} • Onboarding Complete ✓</p>
        </div>
        <div className="flex gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
            ent.hasActiveSubscription ? "bg-[#E8F5EE] text-[#16845B] border border-[#E5EBE7]" : "bg-amber-100 text-amber-800 border border-amber-200"
          }`}>
            {ent.hasActiveSubscription ? (ent.isTrialing ? `Trialing • ${ent.planName}` : `Active • ${ent.planName}`) : "No subscription → Checkout"}
          </span>
          <span className="rounded-full bg-white border border-[#E5EBE7] px-3 py-1 text-xs text-[#718078] font-medium shadow-xs">
            {ent.maxOutlets} outlets • {ent.maxUsers} staff
          </span>
        </div>
      </div>

      {!ent.hasActiveSubscription && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="text-sm text-amber-900"><b>Subscription required:</b> Your POS features are gated until payment is server-verified. 14-day trial available.</div>
          <Link href="/checkout" className="rounded-full bg-[#16845B] text-white px-5 py-2 text-sm font-bold hover:bg-[#116B49] shadow-xs">Go to checkout →</Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Today Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#172B25]">{formatINR(todayOrders.reduce((s,o)=>s+o.totalPaise,0))}</div>
            <div className="text-xs text-[#16845B] font-semibold mt-1">{todayOrders.length} orders today • {ent.canUsePOS ? "POS enabled" : "POS gated"}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#172B25]">{formatINR(totalSales)}</div>
            <div className="text-xs text-[#718078] mt-1">{orders.length} total lifetime orders</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Active Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#172B25]">{tables}</div>
            <div className="text-xs text-[#718078] mt-1">Currently occupied dine-in</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Customers & Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#172B25]">{customers} • {memCount}</div>
            <div className="text-xs text-[#718078] mt-1">Profiles • Staff limit {ent.maxUsers}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1.6fr_0.9fr] gap-6">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-[#172B25]">Outlet Comparison - Tenant Isolated</CardTitle>
          </CardHeader>
          <CardContent>
            {salesByOutlet.length===0 ? (
              <div className="text-sm text-[#718078] py-8 text-center border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
                No sales recorded yet. Use POS to bill your first order.
              </div>
            ) : (
              <div className="space-y-2">
                {salesByOutlet.map(r=> (
                  <div key={r.outletId} className="flex items-center justify-between rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] px-4 py-3">
                    <div>
                      <div className="text-sm font-bold text-[#172B25]">{outletMap[r.outletId] || r.outletId.slice(0,8)}</div>
                      <div className="text-xs text-[#718078]">{r._count} orders</div>
                    </div>
                    <div className="text-sm font-bold text-[#16845B]">{formatINR(r._sum.totalPaise||0)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-[#172B25]">Quick Actions</CardTitle>
            <p className="text-xs text-[#718078]">Gated by active subscription • Inventory {ent.canUseInventory ? "enabled" : "requires Growth"}</p>
          </CardHeader>
          <CardContent className="grid gap-2.5">
            <Link
              href="/app/pos"
              className={`rounded-full px-5 py-3 text-center text-sm font-bold shadow-xs transition ${
                ent.canUsePOS ? "bg-[#16845B] hover:bg-[#116B49] text-white" : "bg-slate-100 text-slate-400 pointer-events-none"
              }`}
            >
              Open POS Billing {ent.canUsePOS ? "" : "(gated)"}
            </Link>
            <Link href="/app/menu" className="rounded-full border border-[#E5EBE7] bg-white px-5 py-2.5 text-center text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] shadow-xs">
              Manage Menu
            </Link>
            <Link href="/app/inventory" className={`rounded-full border px-5 py-2.5 text-center text-sm font-semibold shadow-xs ${
              ent.canUseInventory ? "border-[#E5EBE7] bg-white text-[#172B25] hover:bg-[#F8FAF9]" : "border-slate-200 bg-slate-50 text-slate-400 pointer-events-none"
            }`}>
              Inventory {ent.canUseInventory ? "" : "(Growth+)"}
            </Link>
            <Link href="/app/integrations" className={`rounded-full border px-5 py-2.5 text-center text-sm font-semibold shadow-xs ${
              ent.canUseIntegrations ? "border-[#E5EBE7] bg-white text-[#172B25] hover:bg-[#F8FAF9]" : "border-slate-200 bg-slate-50 text-slate-400 pointer-events-none"
            }`}>
              Integrations {ent.canUseIntegrations ? "" : "(Growth+)"}
            </Link>
            <Link href="/app/reports" className="rounded-full border border-[#E5EBE7] bg-white px-5 py-2.5 text-center text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] shadow-xs">
              View Reports
            </Link>
            <Link href="/checkout" className="rounded-full bg-[#E8F5EE] border border-[#E5EBE7] text-[#16845B] hover:bg-[#16845B] hover:text-white px-5 py-2.5 text-center text-sm font-bold transition shadow-xs">
              Manage Subscription →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.slice(0,5).length===0 ? (
            <div className="text-sm text-[#718078] py-6 text-center border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
              No orders yet.
            </div>
          ) : (
            <div className="space-y-2">
              {orders.slice(0,5).map(o=> (
                <div key={o.id} className="flex justify-between items-center rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-4 py-3">
                  <div>
                    <div className="text-sm font-bold text-[#172B25]">{o.orderNumber} • {o.type}</div>
                    <div className="text-xs text-[#718078]">{o.status} • {new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="text-sm font-bold text-[#16845B]">{formatINR(o.totalPaise)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
