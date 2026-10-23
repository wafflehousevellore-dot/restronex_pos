export const dynamic = "force-dynamic";
import { getSession, getActiveOrgId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/money";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getEntitlements } from "@/lib/entitlements";

export default async function Dashboard(){
  const { userId } = await getSession();
  if (!userId) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-[#3D954F]/20 bg-[#0F1F14] p-6 text-center">
          <div className="text-lg font-bold text-white">Please sign in</div>
          <div className="text-sm text-white/60 mt-1">Your preview session expired. Sign in to view your dashboard.</div>
          <div className="mt-4 flex gap-2 justify-center">
            <a href="/sign-in" className="rounded-full bg-[#3D954F] px-6 py-2.5 text-sm font-bold text-white">Sign In</a>
            <a href="/sign-up" className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white">Create Account</a>
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
        <DarkCard className="p-8 text-center"><div className="text-lg font-bold text-white">No business yet</div><div className="text-sm text-white/60 mt-1">Create your restaurant business to continue - maps to Clerk Organization.</div><Link href="/organization" className="mt-4 inline-block rounded-full bg-[#3D954F] px-6 py-2.5 text-sm font-bold text-white">Create organization →</Link></DarkCard>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-xs text-white/50 text-center">After auth, create/select organization. Your selected plan is preserved via cookie + localStorage.</div>
      </div>
    );
  }
  const tenant = await prisma.tenant.findUnique({ where:{ id: tenantId }, include:{ outlets:true }});
  if (!tenant) redirect("/organization");
  if (!tenant.onboardingComplete) {
    const stepNames = ["Business","Outlet","Tables","Menu","Tax","Staff","Plan","Launch"];
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <DarkCard className="p-6">
          <div className="flex items-center justify-between">
            <div><div className="text-sm font-bold text-white">Onboarding in progress</div><div className="text-xs text-white/50">Step {tenant.onboardingStep+1} of 8 - {stepNames[tenant.onboardingStep]} • You can continue later, progress is saved</div></div>
            <Link href="/app/onboarding" className="rounded-full bg-[#3D954F] px-5 py-2 text-sm font-bold text-white">Continue onboarding →</Link>
          </div>
          <div className="mt-4 grid grid-cols-8 gap-1">{Array.from({length:8}).map((_,i)=> <div key={i} className={`h-2 rounded-full ${i<tenant.onboardingStep ? "bg-[#3D954F]" : i===tenant.onboardingStep ? "bg-white" : "bg-white/10"}`} />)}</div>
          <div className="mt-2 text-xs text-white/40">You can skip integrations and complete later from dashboard. POS is available after Plan step.</div>
        </DarkCard>
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black tracking-tight text-white">Dashboard</h1><p className="text-sm text-white/50">{tenant.name} • {tenant.businessType} • {tenant.slug} • Step {tenant.onboardingStep} {tenant.onboardingComplete ? "✓ Complete" : ""}</p></div>
        <div className="flex gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${ent.hasActiveSubscription ? "bg-[#3D954F] text-white" : "bg-amber-500 text-white"}`}>{ent.hasActiveSubscription ? (ent.isTrialing ? `Trialing • ${ent.planName}` : `Active • ${ent.planName}`) : "No subscription → Checkout"}</span>
          <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/60">{ent.maxOutlets} outlets • {ent.maxUsers} staff</span>
        </div>
      </div>

      {!ent.hasActiveSubscription && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-amber-100"><b>Subscription required:</b> Your POS features are gated until payment is server-verified. Trial available on Starter/Growth.</div>
          <Link href="/checkout" className="rounded-full bg-white text-[#070B07] px-5 py-2 text-sm font-bold">Go to checkout →</Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DarkCard><DarkCardHeader><DarkCardTitle className="text-xs uppercase tracking-widest text-white/50">Today Sales</DarkCardTitle></DarkCardHeader><DarkCardContent><div className="text-2xl font-black text-white">{formatINR(todayOrders.reduce((s,o)=>s+o.totalPaise,0))}</div><div className="text-xs text-[#3D954F]">{todayOrders.length} orders today - {ent.canUsePOS ? "POS enabled" : "POS gated"}</div></DarkCardContent></DarkCard>
        <DarkCard><DarkCardHeader><DarkCardTitle className="text-xs uppercase tracking-widest text-white/50">Total Revenue</DarkCardTitle></DarkCardHeader><DarkCardContent><div className="text-2xl font-black text-white">{formatINR(totalSales)}</div><div className="text-xs text-white/40">{orders.length} total orders</div></DarkCardContent></DarkCard>
        <DarkCard><DarkCardHeader><DarkCardTitle className="text-xs uppercase tracking-widest text-white/50">Active Tables</DarkCardTitle></DarkCardHeader><DarkCardContent><div className="text-2xl font-black text-white">{tables}</div><div className="text-xs text-white/40">Occupied now</div></DarkCardContent></DarkCard>
        <DarkCard><DarkCardHeader><DarkCardTitle className="text-xs uppercase tracking-widest text-white/50">Customers & Staff</DarkCardTitle></DarkCardHeader><DarkCardContent><div className="text-2xl font-black text-white">{customers} • {memCount}</div><div className="text-xs text-white/40">CRM profiles • Members (limit {ent.maxUsers})</div></DarkCardContent></DarkCard>
      </div>

      <div className="grid lg:grid-cols-[1.6fr_0.9fr] gap-6">
        <DarkCard>
          <DarkCardHeader><DarkCardTitle>Outlet Comparison - Tenant-isolated</DarkCardTitle></DarkCardHeader>
          <DarkCardContent>
            {salesByOutlet.length===0 ? <div className="text-sm text-white/40">No sales yet - use POS to create first order. Entitlements: {ent.features.join(", ") || "Basic POS"}</div> :
              <div className="space-y-2">{salesByOutlet.map(r=> (
                <div key={r.outletId} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-4 py-3">
                  <div><div className="text-sm font-bold text-white">{outletMap[r.outletId] || r.outletId.slice(0,8)}</div><div className="text-xs text-white/40">{r._count} orders</div></div>
                  <div className="text-sm font-bold text-white">{formatINR(r._sum.totalPaise||0)}</div>
                </div>
              ))}</div>
            }
          </DarkCardContent>
        </DarkCard>
        <DarkCard>
          <DarkCardHeader><DarkCardTitle>Quick Actions</DarkCardTitle><p className="text-xs text-white/40">Gated by active subscription • Inventory {ent.canUseInventory ? "enabled" : "requires Growth"}</p></DarkCardHeader>
          <DarkCardContent className="grid gap-2">
            <Link href="/app/pos" className={`rounded-full px-5 py-3 text-center text-sm font-bold ${ent.canUsePOS ? "bg-[#3D954F] hover:bg-[#2e7a3e] text-white" : "bg-white/10 text-white/30 pointer-events-none border border-white/10"}`}>Open POS {ent.canUsePOS ? "" : "(gated)"}</Link>
            <Link href="/app/menu" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-white/10">Manage Menu</Link>
            <Link href="/app/inventory" className={`rounded-full border px-5 py-3 text-center text-sm font-semibold ${ent.canUseInventory ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : "border-white/5 bg-white/[0.02] text-white/30 pointer-events-none"}`}>Inventory {ent.canUseInventory ? "" : "(Growth+)"}</Link>
            <Link href="/app/integrations" className={`rounded-full border px-5 py-3 text-center text-sm font-semibold ${ent.canUseIntegrations ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : "border-white/5 bg-white/[0.02] text-white/30 pointer-events-none"}`}>Integrations {ent.canUseIntegrations ? "" : "(Growth+)"}</Link>
            <Link href="/app/reports" className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-white/10">View Reports</Link>
            <Link href="/checkout" className="rounded-full bg-white text-[#070B07] px-5 py-3 text-center text-sm font-bold hover:bg-white/90">Manage subscription →</Link>
          </DarkCardContent>
        </DarkCard>
      </div>

      <DarkCard>
        <DarkCardHeader><DarkCardTitle>Recent Orders (persisted, entitlements gated)</DarkCardTitle></DarkCardHeader>
        <DarkCardContent>
          {orders.slice(0,5).length===0 ? <div className="text-sm text-white/40">No orders yet.</div> : (
            <div className="space-y-2">{orders.slice(0,5).map(o=> (
              <div key={o.id} className="flex justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div><div className="text-sm font-bold text-white">{o.orderNumber} • {o.type}</div><div className="text-xs text-white/40">{o.status} • {new Date(o.createdAt).toLocaleString()}</div></div>
                <div className="text-sm font-bold text-white">{formatINR(o.totalPaise)}</div>
              </div>
            ))}</div>
          )}
        </DarkCardContent>
      </DarkCard>
    </div>
  );
}
