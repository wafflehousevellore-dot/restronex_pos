import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { getOrSetCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Missing tenant" }, { status: 400 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outletId = req.nextUrl.searchParams.get("outletId");
  const days = Math.min(Math.max(1, parseInt(req.nextUrl.searchParams.get("days") || "30", 10)), 90);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const cacheKey = `report_${tenantId}_${outletId || "all"}_${days}d`;

  const reportData = await getOrSetCache(
    cacheKey,
    async () => {
      const orderWhere: any = {
        tenantId,
        createdAt: { gte: startDate },
      };
      if (outletId) orderWhere.outletId = outletId;

      // 1. High-speed database-level aggregations
      const [grossAgg, netAgg, taxAgg, customers, lowStockCount] = await Promise.all([
        prisma.order.aggregate({
          where: orderWhere,
          _sum: { totalPaise: true },
          _count: true,
        }),
        prisma.order.aggregate({
          where: { ...orderWhere, status: { not: "CANCELLED" } },
          _sum: { totalPaise: true },
          _count: true,
        }),
        prisma.order.aggregate({
          where: orderWhere,
          _sum: { taxPaise: true },
        }),
        prisma.customer.count({ where: { tenantId } }),
        prisma.inventoryItem.count({
          where: {
            tenantId,
            currentStock: { lte: 5 }, // standard threshold
          },
        }),
      ]);

      const totalSales = grossAgg._sum.totalPaise || 0;
      const netSales = netAgg._sum.totalPaise || 0;
      const totalTaxPaise = taxAgg._sum.taxPaise || 0;
      const orderCount = grossAgg._count || 0;
      const avgOrder = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;

      // 2. Fetch payments for tender breakdown
      const payments = await prisma.payment.findMany({
        where: {
          tenantId,
          status: "SUCCESS",
          createdAt: { gte: startDate },
        },
        select: { method: true, amountPaise: true },
      });

      const methodTotals: Record<string, number> = {};
      for (const p of payments) {
        const m = p.method || "CASH";
        methodTotals[m] = (methodTotals[m] || 0) + p.amountPaise;
      }
      const salesByMethod = Object.entries(methodTotals).map(([method, revenue]) => ({
        method,
        revenue,
      }));

      // 2. Sample recent orders for daily breakdown and top items (capped at 500 for bounded memory)
      const recentOrders = await prisma.order.findMany({
        where: orderWhere,
        select: {
          createdAt: true,
          totalPaise: true,
          items: {
            select: { name: true, quantity: true, totalPaise: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      const byDay: Record<string, number> = {};
      const topItems: Record<string, { qty: number; revenue: number }> = {};

      for (const o of recentOrders) {
        const d = new Date(o.createdAt).toISOString().slice(0, 10);
        byDay[d] = (byDay[d] || 0) + o.totalPaise;

        for (const it of o.items) {
          const k = it.name;
          if (!topItems[k]) topItems[k] = { qty: 0, revenue: 0 };
          topItems[k].qty += it.quantity;
          topItems[k].revenue += it.totalPaise;
        }
      }

      const topSorted = Object.entries(topItems)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5);

      return {
        kpis: {
          totalSalesPaise: totalSales,
          netSalesPaise: netSales,
          totalOrders: orderCount,
          orderCount,
          avgOrderPaise: avgOrder,
          totalTaxPaise,
          customers,
          lowStock: lowStockCount,
        },
        salesByDay: Object.entries(byDay).map(([date, paise]) => ({ date, paise })),
        salesByMethod,
        topItems: topSorted.map(([name, v]) => ({ name, ...v })),
        definitions: {
          grossSales: "Sum of orders totalPaise within period",
          netSales: "Gross excluding CANCELLED orders",
          avgOrderValue: "totalSales / orderCount",
          totalTaxPaise: "Total GST collected",
        },
      };
    },
    45
  );

  const res = NextResponse.json(reportData);
  res.headers.set("Cache-Control", "private, s-maxage=30, stale-while-revalidate=60");
  return res;
}
