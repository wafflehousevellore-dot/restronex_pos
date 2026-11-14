export const dynamic = "force-dynamic";
import { getSession, getActiveOrgId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/money";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getEntitlements } from "@/lib/entitlements";
import { getTimeZoneDateString, getTimeZoneDayBoundsUtc } from "@/lib/timezone";

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
  const ent = await getEntitlements(tenantId);

  if (!tenant.onboardingComplete) {
    const stepNames = [
      "Business",
      "Address",
      "Outlet",
      "Tax & Billing",
      "Menu",
      "Staff",
      "WhatsApp",
      "Printer",
      "Tables & KOT",
      "Launch",
    ];
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {!ent.hasActiveSubscription && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-center justify-between gap-3">
            <span><b>Restaurant in Setup Mode:</b> Complete Restaurant Onboarding and select your plan to activate full POS billing.</span>
            <Link href="/checkout?plan=growth&cycle=MONTHLY" className="rounded-full bg-[#16845B] text-white px-4 py-1.5 font-bold hover:bg-[#116B49] shrink-0">
              Select Plan →
            </Link>
          </div>
        )}
        <Card className="p-6 bg-white border-[#E5EBE7] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-bold text-[#172B25]">Onboarding in progress</div>
              <div className="text-xs text-[#718078] mt-0.5">Step {Math.min(tenant.onboardingStep + 1, 10)} of 10 - {stepNames[Math.min(tenant.onboardingStep, 9)]} • Progress is saved</div>
            </div>
            <Link href="/app/onboarding" className="rounded-full bg-[#16845B] px-5 py-2 text-sm font-bold text-white hover:bg-[#116B49] shadow-xs">Continue onboarding →</Link>
          </div>
          <div className="mt-5 grid grid-cols-10 gap-1.5">
            {Array.from({length:10}).map((_,i)=> (
              <div key={i} className={`h-2 rounded-full ${i<tenant.onboardingStep ? "bg-[#16845B]" : i===tenant.onboardingStep ? "bg-[#16845B]/60" : "bg-[#E5EBE7]"}`} />
            ))}
          </div>
          <div className="mt-3 text-xs text-[#718078]">Complete onboarding steps (WhatsApp &amp; Printer can be skipped cleanly) to launch your POS workspace.</div>
        </Card>
      </div>
    );
  }

  if (!ent.hasActiveSubscription) {
    redirect("/checkout?reason=subscription_required");
  }

  const tz = tenant.timeZone || "Asia/Kolkata";
  const now = new Date();
  const todayBounds = getTimeZoneDayBoundsUtc(undefined, tz, now);
  const yesterdayStr = getTimeZoneDateString(
    new Date(now.getTime() - 24 * 60 * 60 * 1000),
    tz
  );
  const yesterdayBounds = getTimeZoneDayBoundsUtc(yesterdayStr, tz, now);
  const urgentCutoff = new Date(now.getTime() - 15 * 60 * 1000);
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    todayAgg,
    yesterdayAgg,
    totalAgg,
    recentOrders,
    customers,
    tables,
    memCount,
    salesByOutlet,
    outlets,
    activeKdsTickets,
    urgentKdsTickets,
    inventoryItems,
    waConnectedCount,
    printerCount,
    waFailed24h,
    printFailed24h,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        tenantId,
        status: { not: "CANCELLED" },
        createdAt: { gte: todayBounds.startOfDay, lte: todayBounds.endOfDay },
      },
      _sum: { totalPaise: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: {
        tenantId,
        status: { not: "CANCELLED" },
        createdAt: { gte: yesterdayBounds.startOfDay, lte: yesterdayBounds.endOfDay },
      },
      _sum: { totalPaise: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { tenantId, status: { not: "CANCELLED" } },
      _sum: { totalPaise: true },
      _count: true,
    }),
    prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { outlet: { select: { name: true } } },
    }),
    prisma.customer.count({ where: { tenantId } }),
    prisma.table.count({ where: { tenantId, status: "OCCUPIED" } }),
    prisma.membership.count({ where: { tenantId } }),
    prisma.order.groupBy({
      by: ["outletId"],
      where: { tenantId, status: { not: "CANCELLED" } },
      _sum: { totalPaise: true },
      _count: true,
    }),
    prisma.outlet.findMany({ where: { tenantId } }),
    prisma.kitchenTicket.count({
      where: { tenantId, status: { in: ["NEW", "PREPARING"] } },
    }),
    prisma.kitchenTicket.count({
      where: {
        tenantId,
        status: { in: ["NEW", "PREPARING"] },
        createdAt: { lte: urgentCutoff },
      },
    }),
    prisma.inventoryItem.findMany({
      where: { tenantId },
      select: { id: true, name: true, currentStock: true, lowStockThreshold: true, unit: true },
    }),
    prisma.outletWhatsAppConfig.count({
      where: { tenantId, status: "CONNECTED" },
    }),
    prisma.printerDevice.count({ where: { tenantId } }),
    prisma.whatsAppMessageQueue.count({
      where: { tenantId, status: "FAILED", createdAt: { gte: last24h } },
    }),
    prisma.printJob.count({
      where: { tenantId, status: "FAILED", createdAt: { gte: last24h } },
    }),
  ]);

  const todaySales = todayAgg._sum.totalPaise || 0;
  const todayOrdersCount = todayAgg._count || 0;
  const yesterdaySales = yesterdayAgg._sum.totalPaise || 0;
  const todayDeltaPct =
    yesterdaySales > 0
      ? Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100)
      : null;
  const totalSales = totalAgg._sum.totalPaise || 0;
  const lifetimeOrdersCount = totalAgg._count || 0;
  const lowStockItems = inventoryItems.filter(
    (item) => item.currentStock <= item.lowStockThreshold
  );
  const failedAutomationCount = waFailed24h + printFailed24h;
  const outletMap = Object.fromEntries(outlets.map((o) => [o.id, o.name]));

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
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">
              Today Sales ({todayBounds.date})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#172B25]">{formatINR(todaySales)}</div>
            <div className="text-xs text-[#16845B] font-semibold mt-1">
              {todayOrdersCount} orders today
              {todayDeltaPct !== null && (
                <span className={todayDeltaPct >= 0 ? "text-[#16845B]" : "text-amber-600"}>
                  {" "}• {todayDeltaPct >= 0 ? "+" : ""}{todayDeltaPct}% vs yesterday
                </span>
              )}
              {" "}• {ent.canUsePOS ? "POS enabled" : "POS gated"}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#172B25]">{formatINR(totalSales)}</div>
            <div className="text-xs text-[#718078] mt-1">
              {lifetimeOrdersCount} non-cancelled lifetime orders
            </div>
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/app/kitchen" className="block group">
          <Card className={`h-full border shadow-xs transition group-hover:border-[#16845B]/50 ${urgentKdsTickets > 0 ? "bg-amber-50/70 border-amber-200" : "bg-white border-[#E5EBE7]"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Live Kitchen Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-[#172B25]">{activeKdsTickets} active tickets</div>
              <div className={`text-xs font-semibold mt-1 ${urgentKdsTickets > 0 ? "text-amber-700" : "text-[#16845B]"}`}>
                {urgentKdsTickets > 0 ? `${urgentKdsTickets} delayed (>15m) • View KDS →` : "Kitchen running on time →"}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/app/inventory" className="block group">
          <Card className={`h-full border shadow-xs transition group-hover:border-[#16845B]/50 ${lowStockItems.length > 0 ? "bg-red-50/50 border-red-200" : "bg-white border-[#E5EBE7]"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-[#172B25]">{lowStockItems.length} low-stock items</div>
              <div className={`text-xs font-semibold mt-1 truncate ${lowStockItems.length > 0 ? "text-red-700" : "text-[#16845B]"}`}>
                {lowStockItems.length > 0 ? `Reorder: ${lowStockItems[0].name} (${lowStockItems[0].currentStock} ${lowStockItems[0].unit})` : "All ingredients above threshold →"}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/app/integrations" className="block group">
          <Card className={`h-full border shadow-xs transition group-hover:border-[#16845B]/50 ${failedAutomationCount > 0 ? "bg-amber-50/70 border-amber-200" : "bg-white border-[#E5EBE7]"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">WhatsApp & Printers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-[#172B25]">{waConnectedCount} WA • {printerCount} Printers</div>
              <div className={`text-xs font-semibold mt-1 ${failedAutomationCount > 0 ? "text-amber-700" : "text-[#718078]"}`}>
                {failedAutomationCount > 0 ? `${failedAutomationCount} failed job(s) in 24h • Inspect →` : "Billing automation ready →"}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/app/reports" className="block group">
          <Card className="h-full bg-[#E8F5EE]/60 border-[#16845B]/25 shadow-xs transition group-hover:border-[#16845B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-wider text-[#16845B]">Business Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-[#172B25]">
                {todayOrdersCount > 0 ? formatINR(Math.round(todaySales / todayOrdersCount)) : "₹0"} avg bill
              </div>
              <div className="text-xs font-semibold text-[#16845B] mt-1">
                Charts, COGS, GST & CSV export →
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-sm text-[#718078] py-6 text-center border border-dashed border-[#E5EBE7] rounded-xl bg-[#F8FAF9]">
              No orders yet.
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex justify-between items-center rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-4 py-3">
                  <div>
                    <div className="text-sm font-bold text-[#172B25]">
                      {o.orderNumber} • {o.type} {o.outlet?.name ? `(${o.outlet.name})` : ""}
                    </div>
                    <div className="text-xs text-[#718078]">
                      <span className={o.status === "CANCELLED" ? "text-red-600 font-semibold" : ""}>{o.status}</span>
                      {" "}• {new Date(o.createdAt).toLocaleString("en-IN", { timeZone: todayBounds.timeZone })}
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${o.status === "CANCELLED" ? "text-[#718078] line-through" : "text-[#16845B]"}`}>
                    {formatINR(o.totalPaise)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
