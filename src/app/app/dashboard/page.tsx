export const dynamic = "force-dynamic";

import { getSession, getActiveOrgId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getEntitlements } from "@/lib/entitlements";
import {
  getTimeZoneDateString,
  getTimeZoneDayBoundsUtc,
  normalizeTimeZone,
} from "@/lib/timezone";
import { DashboardClient } from "@/components/app/dashboard/DashboardClient";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, userId } = await getSession();
  if (!userId || !user) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="rounded-3xl border border-[#E5EBE7] bg-white p-8 text-center shadow-xs">
          <div className="text-xl font-bold text-[#172B25]">Please sign in</div>
          <div className="text-sm text-[#718078] mt-1.5">
            Your session expired. Sign in to view your restaurant management dashboard.
          </div>
          <div className="mt-6 flex gap-3 justify-center">
            <Link
              href="/sign-in"
              className="rounded-xl bg-[#16845B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#116B49] shadow-xs"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl border border-[#E5EBE7] bg-white px-6 py-2.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9]"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let tenantId = await getActiveOrgId();
  if (!tenantId) {
    const mem = await prisma.membership.findFirst({ where: { userId } });
    tenantId = mem?.tenantId || null;
  }

  if (!tenantId) {
    return (
      <div className="max-w-3xl mx-auto py-12 space-y-4">
        <Card className="p-8 text-center bg-white border-[#E5EBE7] shadow-xs">
          <div className="text-xl font-bold text-[#172B25]">No restaurant business found</div>
          <div className="text-sm text-[#718078] mt-1.5">
            Create or link your restaurant business to continue.
          </div>
          <Link
            href="/app/organization"
            className="mt-6 inline-block rounded-xl bg-[#16845B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#116B49] shadow-xs"
          >
            Create organization →
          </Link>
        </Card>
      </div>
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { outlets: { orderBy: { createdAt: "asc" } } },
  });
  if (!tenant) redirect("/app/organization");

  const ent = await getEntitlements(tenantId);

  // If onboarding is not completed, display the onboarding wizard card
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
      <div className="max-w-3xl mx-auto py-8 space-y-4">
        {!ent.hasActiveSubscription && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-center justify-between gap-3">
            <span>
              <b>Restaurant in Setup Mode:</b> Complete Restaurant Onboarding and select your plan to
              activate full POS billing.
            </span>
            <Link
              href="/checkout?plan=growth&cycle=MONTHLY"
              className="rounded-xl bg-[#16845B] text-white px-4 py-1.5 font-bold hover:bg-[#116B49] shrink-0"
            >
              Select Plan →
            </Link>
          </div>
        )}
        <Card className="p-6 bg-white border-[#E5EBE7] shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-bold text-[#172B25]">Onboarding in progress</div>
              <div className="text-xs text-[#718078] mt-0.5">
                Step {Math.min(tenant.onboardingStep + 1, 10)} of 10 -{" "}
                {stepNames[Math.min(tenant.onboardingStep, 9)]} • Progress is saved
              </div>
            </div>
            <Link
              href="/app/onboarding"
              className="rounded-xl bg-[#16845B] px-5 py-2 text-sm font-bold text-white hover:bg-[#116B49] shadow-xs"
            >
              Continue onboarding →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-10 gap-1.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full ${
                  i < tenant.onboardingStep
                    ? "bg-[#16845B]"
                    : i === tenant.onboardingStep
                    ? "bg-[#16845B]/60"
                    : "bg-[#E5EBE7]"
                }`}
              />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (!ent.hasActiveSubscription) {
    redirect("/checkout?reason=subscription_required");
  }

  // Parse search params for outlet and date range filters
  const sp = (await searchParams) || {};
  const selectedOutletId = typeof sp.outletId === "string" ? sp.outletId : "all";
  const selectedRange = typeof sp.range === "string" ? sp.range : "today";
  const customFrom = typeof sp.from === "string" ? sp.from : undefined;
  const customTo = typeof sp.to === "string" ? sp.to : undefined;

  const tz = normalizeTimeZone(tenant.timeZone);
  const now = new Date();

  // Compute Current Period & Equivalent Prior Period Bounds
  let periodStart: Date;
  let periodEnd: Date;
  let priorStart: Date;
  let priorEnd: Date;
  let periodLabel = "Today";
  let isHourly = false;

  const todayBounds = getTimeZoneDayBoundsUtc(undefined, tz, now);
  const yesterdayDateStr = getTimeZoneDateString(new Date(now.getTime() - 86400000), tz);
  const yesterdayBounds = getTimeZoneDayBoundsUtc(yesterdayDateStr, tz, now);

  if (selectedRange === "yesterday") {
    periodStart = yesterdayBounds.startOfDay;
    periodEnd = yesterdayBounds.endOfDay;
    const dayBeforeYesterdayStr = getTimeZoneDateString(new Date(now.getTime() - 2 * 86400000), tz);
    const dayBeforeYesterdayBounds = getTimeZoneDayBoundsUtc(dayBeforeYesterdayStr, tz, now);
    priorStart = dayBeforeYesterdayBounds.startOfDay;
    priorEnd = dayBeforeYesterdayBounds.endOfDay;
    periodLabel = "Yesterday";
    isHourly = true;
  } else if (selectedRange === "7d") {
    periodStart = new Date(now.getTime() - 7 * 86400000);
    periodEnd = now;
    priorStart = new Date(now.getTime() - 14 * 86400000);
    priorEnd = periodStart;
    periodLabel = "Last 7 Days";
  } else if (selectedRange === "30d") {
    periodStart = new Date(now.getTime() - 30 * 86400000);
    periodEnd = now;
    priorStart = new Date(now.getTime() - 60 * 86400000);
    priorEnd = periodStart;
    periodLabel = "Last 30 Days";
  } else if (selectedRange === "this_month") {
    const todayStr = getTimeZoneDateString(now, tz);
    const [y, m] = todayStr.split("-").map(Number);
    const firstOfMonthBounds = getTimeZoneDayBoundsUtc(`${y}-${String(m).padStart(2, "0")}-01`, tz, now);
    periodStart = firstOfMonthBounds.startOfDay;
    periodEnd = now;
    const duration = periodEnd.getTime() - periodStart.getTime();
    priorEnd = periodStart;
    priorStart = new Date(priorEnd.getTime() - duration);
    periodLabel = "This Month";
  } else if (selectedRange === "custom" && customFrom && customTo) {
    const startBounds = getTimeZoneDayBoundsUtc(customFrom, tz, now);
    const endBounds = getTimeZoneDayBoundsUtc(customTo, tz, now);
    periodStart = startBounds.startOfDay;
    periodEnd = endBounds.endOfDay;
    const duration = periodEnd.getTime() - periodStart.getTime();
    priorEnd = periodStart;
    priorStart = new Date(priorEnd.getTime() - duration);
    periodLabel = `${customFrom} to ${customTo}`;
  } else {
    // Default: Today
    periodStart = todayBounds.startOfDay;
    periodEnd = todayBounds.endOfDay;
    priorStart = yesterdayBounds.startOfDay;
    priorEnd = yesterdayBounds.endOfDay;
    periodLabel = "Today";
    isHourly = true;
  }

  // Construct base order filter (respecting outlet selection)
  const baseOrderWhere: any = {
    tenantId,
    status: { not: "CANCELLED" },
    createdAt: { gte: periodStart, lte: periodEnd },
  };

  const priorOrderWhere: any = {
    tenantId,
    status: { not: "CANCELLED" },
    createdAt: { gte: priorStart, lte: priorEnd },
  };

  if (selectedOutletId !== "all") {
    baseOrderWhere.outletId = selectedOutletId;
    priorOrderWhere.outletId = selectedOutletId;
  }

  const urgentCutoff = new Date(now.getTime() - 15 * 60 * 1000);

  // Execute Parallel Aggregations & Queries
  const [
    currentAgg,
    priorAgg,
    channelOrders,
    periodOrdersList,
    recentOrdersList,
    activeKdsTickets,
    urgentKdsTickets,
    openOrdersCount,
    preparingOrdersCount,
    readyOrdersCount,
    cancelledOrdersCount,
    inventoryItems,
    topSellingOrderItems,
    salesByOutletGroup,
  ] = await Promise.all([
    // 1. Current period total
    prisma.order.aggregate({
      where: baseOrderWhere,
      _sum: { totalPaise: true },
      _count: true,
    }),

    // 2. Prior period total
    prisma.order.aggregate({
      where: priorOrderWhere,
      _sum: { totalPaise: true },
      _count: true,
    }),

    // 3. Orders grouped by channel and serviceMode
    prisma.order.findMany({
      where: baseOrderWhere,
      select: {
        id: true,
        type: true,
        serviceMode: true,
        channel: true,
        totalPaise: true,
      },
    }),

    // 4. Period orders list for trend grouping
    prisma.order.findMany({
      where: baseOrderWhere,
      select: {
        createdAt: true,
        totalPaise: true,
      },
      orderBy: { createdAt: "asc" },
    }),

    // 5. Recent 10 orders for live feed
    prisma.order.findMany({
      where: selectedOutletId === "all" ? { tenantId } : { tenantId, outletId: selectedOutletId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        outlet: { select: { name: true } },
      },
    }),

    // 6. Active KDS tickets
    prisma.kitchenTicket.count({
      where: {
        tenantId,
        ...(selectedOutletId !== "all" ? { outletId: selectedOutletId } : {}),
        status: { in: ["NEW", "PREPARING", "RECEIVED"] },
      },
    }),

    // 7. Urgent KDS tickets (>15 mins)
    prisma.kitchenTicket.count({
      where: {
        tenantId,
        ...(selectedOutletId !== "all" ? { outletId: selectedOutletId } : {}),
        status: { in: ["NEW", "PREPARING", "RECEIVED"] },
        createdAt: { lte: urgentCutoff },
      },
    }),

    // 8. Open orders
    prisma.order.count({
      where: {
        tenantId,
        ...(selectedOutletId !== "all" ? { outletId: selectedOutletId } : {}),
        status: { in: ["OPEN", "PENDING"] },
      },
    }),

    // 9. Preparing orders
    prisma.order.count({
      where: {
        tenantId,
        ...(selectedOutletId !== "all" ? { outletId: selectedOutletId } : {}),
        status: "PREPARING",
      },
    }),

    // 10. Ready orders
    prisma.order.count({
      where: {
        tenantId,
        ...(selectedOutletId !== "all" ? { outletId: selectedOutletId } : {}),
        status: "READY",
      },
    }),

    // 11. Cancelled orders in period
    prisma.order.count({
      where: {
        tenantId,
        ...(selectedOutletId !== "all" ? { outletId: selectedOutletId } : {}),
        status: "CANCELLED",
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),

    // 12. Inventory items for stock health
    prisma.inventoryItem.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        currentStock: true,
        lowStockThreshold: true,
        unit: true,
      },
    }),

    // 13. Top-selling products in period
    prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: {
        order: baseOrderWhere,
      },
      _sum: { quantity: true, totalPaise: true },
      orderBy: { _sum: { totalPaise: "desc" } },
      take: 10,
    }),

    // 14. Sales by outlet group
    tenant.outlets.length > 1
      ? prisma.order.groupBy({
          by: ["outletId"],
          where: {
            tenantId,
            status: { not: "CANCELLED" },
            createdAt: { gte: periodStart, lte: periodEnd },
          },
          _sum: { totalPaise: true },
          _count: true,
        })
      : Promise.resolve([]),
  ]);

  // Compute KPIs & Deltas
  const currRevenue = currentAgg._sum.totalPaise || 0;
  const currOrders = currentAgg._count || 0;
  const currAov = currOrders > 0 ? Math.round(currRevenue / currOrders) : 0;

  const prevRevenue = priorAgg._sum.totalPaise || 0;
  const prevOrders = priorAgg._count || 0;
  const prevAov = prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0;

  const revenueDeltaPct =
    prevRevenue > 0 ? Math.round(((currRevenue - prevRevenue) / prevRevenue) * 100) : null;
  const ordersDeltaPct =
    prevOrders > 0 ? Math.round(((currOrders - prevOrders) / prevOrders) * 100) : null;
  const aovDeltaPct = prevAov > 0 ? Math.round(((currAov - prevAov) / prevAov) * 100) : null;

  // Compute Non-Overlapping Channel Sales
  let dineInPaise = 0, dineInCount = 0;
  let takeawayPaise = 0, takeawayCount = 0;
  let swiggyPaise = 0, swiggyCount = 0;
  let zomatoPaise = 0, zomatoCount = 0;
  let qrPaise = 0, qrCount = 0;
  let webPaise = 0, webCount = 0;

  channelOrders.forEach((o) => {
    const ch = (o.channel || "").toUpperCase();
    const tp = (o.type || "").toUpperCase();
    const sm = (o.serviceMode || "").toUpperCase();
    const amount = o.totalPaise || 0;

    if (ch === "SWIGGY" || tp === "SWIGGY") {
      swiggyPaise += amount;
      swiggyCount++;
    } else if (ch === "ZOMATO" || tp === "ZOMATO") {
      zomatoPaise += amount;
      zomatoCount++;
    } else if (ch === "QR" || tp === "QR") {
      qrPaise += amount;
      qrCount++;
    } else if (ch === "WEBSITE" || tp === "ONLINE") {
      webPaise += amount;
      webCount++;
    } else if (sm === "TAKEAWAY" || tp === "TAKEAWAY") {
      takeawayPaise += amount;
      takeawayCount++;
    } else {
      dineInPaise += amount;
      dineInCount++;
    }
  });

  const onlinePaise = swiggyPaise + zomatoPaise + qrPaise + webPaise;
  const onlineCount = swiggyCount + zomatoCount + qrCount + webCount;

  // Channel breakdown array with distinct, non-overlapping metrics
  const channelBreakdown = [
    {
      channel: "dine_in",
      label: "Dine-In Restaurant",
      revenuePaise: dineInPaise,
      orderCount: dineInCount,
      percentage: currRevenue > 0 ? Math.round((dineInPaise / currRevenue) * 100) : 0,
      color: "bg-emerald-600",
    },
    {
      channel: "takeaway",
      label: "Takeaway & Pickup",
      revenuePaise: takeawayPaise,
      orderCount: takeawayCount,
      percentage: currRevenue > 0 ? Math.round((takeawayPaise / currRevenue) * 100) : 0,
      color: "bg-amber-500",
    },
    {
      channel: "qr_direct",
      label: "Table QR Contactless",
      revenuePaise: qrPaise,
      orderCount: qrCount,
      percentage: currRevenue > 0 ? Math.round((qrPaise / currRevenue) * 100) : 0,
      color: "bg-teal-500",
    },
    {
      channel: "swiggy",
      label: "Swiggy Delivery",
      revenuePaise: swiggyPaise,
      orderCount: swiggyCount,
      percentage: currRevenue > 0 ? Math.round((swiggyPaise / currRevenue) * 100) : 0,
      color: "bg-orange-500",
    },
    {
      channel: "zomato",
      label: "Zomato Delivery",
      revenuePaise: zomatoPaise,
      orderCount: zomatoCount,
      percentage: currRevenue > 0 ? Math.round((zomatoPaise / currRevenue) * 100) : 0,
      color: "bg-red-500",
    },
    {
      channel: "website",
      label: "Direct Website Orders",
      revenuePaise: webPaise,
      orderCount: webCount,
      percentage: currRevenue > 0 ? Math.round((webPaise / currRevenue) * 100) : 0,
      color: "bg-sky-500",
    },
  ].filter((c) => c.orderCount > 0 || c.revenuePaise > 0);

  // Compute Hourly or Daily Trend Data Points
  const trendBuckets: Record<string, { label: string; revenuePaise: number; orders: number }> = {};

  if (isHourly) {
    for (let h = 0; h < 24; h++) {
      const label = `${String(h).padStart(2, "0")}:00`;
      trendBuckets[String(h)] = { label, revenuePaise: 0, orders: 0 };
    }

    periodOrdersList.forEach((o) => {
      const orderDate = new Date(o.createdAt);
      const hourStr = String(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(orderDate));
      if (trendBuckets[hourStr]) {
        trendBuckets[hourStr].revenuePaise += o.totalPaise;
        trendBuckets[hourStr].orders++;
      }
    });
  } else {
    periodOrdersList.forEach((o) => {
      const dayStr = getTimeZoneDateString(new Date(o.createdAt), tz);
      if (!trendBuckets[dayStr]) {
        const parts = dayStr.split("-");
        const label = `${parts[2]}/${parts[1]}`;
        trendBuckets[dayStr] = { label, revenuePaise: 0, orders: 0 };
      }
      trendBuckets[dayStr].revenuePaise += o.totalPaise;
      trendBuckets[dayStr].orders++;
    });
  }

  const trendData = Object.values(trendBuckets).map((b) => ({
    label: b.label,
    revenuePaise: b.revenuePaise,
    orders: b.orders,
    aovPaise: b.orders > 0 ? Math.round(b.revenuePaise / b.orders) : 0,
  }));

  // Fetch Metadata for Top Selling Products
  const menuItemIds = topSellingOrderItems.map((item) => item.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      category: { select: { name: true } },
    },
  });
  const menuItemMap = Object.fromEntries(menuItems.map((m) => [m.id, m]));

  const topSellingProducts = topSellingOrderItems.map((item) => {
    const info = menuItemMap[item.menuItemId];
    return {
      id: item.menuItemId,
      name: info?.name || "Menu Item",
      imageUrl: info?.imageUrl || null,
      categoryName: info?.category?.name || "General",
      quantitySold: item._sum.quantity || 0,
      revenuePaise: item._sum.totalPaise || 0,
    };
  });

  // Recent Orders formatted
  const recentOrders = recentOrdersList.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    source: o.type,
    channel: o.channel,
    customerName: o.customerName || "Walk-in Guest",
    customerPhone: o.customerPhone || null,
    outletName: o.outlet?.name || "Main Outlet",
    timeFormatted: new Intl.DateTimeFormat("en-IN", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    }).format(new Date(o.createdAt)),
    totalPaise: o.totalPaise,
    isPaid: o.isPaid,
    status: o.status,
  }));

  // Inventory Health
  const lowStockCount = inventoryItems.filter(
    (i) => i.currentStock > 0 && i.currentStock <= i.lowStockThreshold
  ).length;
  const outOfStockCount = inventoryItems.filter((i) => i.currentStock <= 0).length;
  const criticalStockItems = inventoryItems
    .filter((i) => i.currentStock <= i.lowStockThreshold)
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      name: i.name,
      currentStock: i.currentStock,
      lowStockThreshold: i.lowStockThreshold,
      unit: i.unit,
    }));

  // Outlet Comparison (if multi-outlet)
  let outletComparison: any[] | undefined = undefined;
  if (tenant.outlets.length > 1) {
    const outletMap = Object.fromEntries(tenant.outlets.map((o) => [o.id, o.name]));
    let maxRev = -1;

    outletComparison = salesByOutletGroup.map((r) => {
      const rev = r._sum.totalPaise || 0;
      if (rev > maxRev) maxRev = rev;
      return {
        outletId: r.outletId,
        name: outletMap[r.outletId] || "Outlet",
        revenuePaise: rev,
        orders: r._count || 0,
        aovPaise: r._count > 0 ? Math.round(rev / r._count) : 0,
        sharePct: currRevenue > 0 ? Math.round((rev / currRevenue) * 100) : 0,
      };
    });

    outletComparison.forEach((item) => {
      item.isBestPerforming = item.revenuePaise > 0 && item.revenuePaise === maxRev;
    });
  }

  return (
    <DashboardClient
      userName={user.name || "Owner"}
      businessName={tenant.name}
      businessType={tenant.businessType || "Restaurant"}
      outlets={tenant.outlets.map((o) => ({ id: o.id, name: o.name }))}
      selectedOutletId={selectedOutletId}
      selectedRange={selectedRange}
      startDate={customFrom}
      endDate={customTo}
      periodLabel={periodLabel}
      kpis={{
        revenuePaise: currRevenue,
        revenueDeltaPct,
        ordersCount: currOrders,
        ordersDeltaPct,
        aovPaise: currAov,
        aovDeltaPct,
        dineInPaise,
        dineInCount,
        takeawayPaise,
        takeawayCount,
        onlinePaise,
        onlineCount,
        swiggyPaise,
        swiggyCount,
        zomatoPaise,
        zomatoCount,
      }}
      trendData={trendData}
      channelBreakdown={channelBreakdown}
      topSellingProducts={topSellingProducts}
      recentOrders={recentOrders}
      operations={{
        pendingOrdersCount: openOrdersCount,
        preparingOrdersCount,
        readyOrdersCount,
        cancelledOrdersCount,
        activeKdsTickets,
        urgentKdsTickets,
        lowStockCount,
        outOfStockCount,
        criticalStockItems,
      }}
      outletComparison={outletComparison}
    />
  );
}
