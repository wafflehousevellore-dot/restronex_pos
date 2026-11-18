import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

/**
 * GET /api/reports/export?type=...&tenantId=...&days=...
 * Generates downloadable CSV exports for financial records.
 */
export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const type = req.nextUrl.searchParams.get("type") || "daily";
  const days = Math.max(1, Math.min(365, parseInt(req.nextUrl.searchParams.get("days") || "30", 10)));
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  if (type === "gst") {
    // GSTR-1 Tax Summary Report
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        status: { not: "CANCELLED" },
        createdAt: { gte: sinceDate },
      },
      include: { outlet: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const headers = "Invoice/Order #,Date,Outlet,Service Mode,Subtotal (₹),Taxable Value (₹),CGST 2.5% (₹),SGST 2.5% (₹),Total Tax (₹),Grand Total (₹)\n";
    const rows = orders.map((o) => {
      const dateStr = o.createdAt.toISOString().split("T")[0];
      const subtotal = (o.subtotalPaise / 100).toFixed(2);
      const discount = (o.discountPaise / 100).toFixed(2);
      const taxable = Math.max(0, (o.subtotalPaise - o.discountPaise) / 100).toFixed(2);
      const cgst = ((o.taxPaise / 2) / 100).toFixed(2);
      const sgst = (Math.ceil(o.taxPaise / 2) / 100).toFixed(2);
      const totalTax = (o.taxPaise / 100).toFixed(2);
      const grandTotal = (o.totalPaise / 100).toFixed(2);

      return `"${o.orderNumber}","${dateStr}","${o.outlet.name}","${o.serviceMode}","${subtotal}","${taxable}","${cgst}","${sgst}","${totalTax}","${grandTotal}"`;
    }).join("\n");

    return new Response(headers + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gstr1-tax-report-${days}days.csv"`,
      },
    });
  } else if (type === "dayend") {
    // Day-End Z-Reports
    const dayEnds = await prisma.dayEndSummary.findMany({
      where: { tenantId },
      include: { outlet: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 90,
    });

    const headers = "Date,Outlet,Orders Count,Gross Sales (₹),Petty Expenses (₹),Closed Timestamp\n";
    const rows = dayEnds.map((d) => {
      const sales = (d.salesPaise / 100).toFixed(2);
      const expenses = (d.expensePaise / 100).toFixed(2);
      return `"${d.date}","${d.outlet.name}","${d.orders}","${sales}","${expenses}","${d.closedAt.toISOString()}"`;
    }).join("\n");

    return new Response(headers + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="day-end-closing-reports.csv"`,
      },
    });
  } else {
    // Daily Sales Report
    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        status: { not: "CANCELLED" },
        createdAt: { gte: sinceDate },
      },
      select: {
        totalPaise: true,
        subtotalPaise: true,
        taxPaise: true,
        discountPaise: true,
        createdAt: true,
      },
    });

    const dayMap: Record<string, { count: number; sales: number; tax: number; discount: number }> = {};
    for (const o of orders) {
      const d = o.createdAt.toISOString().split("T")[0];
      if (!dayMap[d]) dayMap[d] = { count: 0, sales: 0, tax: 0, discount: 0 };
      dayMap[d].count += 1;
      dayMap[d].sales += o.totalPaise;
      dayMap[d].tax += o.taxPaise;
      dayMap[d].discount += o.discountPaise;
    }

    const headers = "Date,Orders Count,Gross Sales (₹),Discount (₹),Tax Collected (₹),Net Revenue (₹)\n";
    const rows = Object.entries(dayMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([d, stat]) => {
        const sales = (stat.sales / 100).toFixed(2);
        const disc = (stat.discount / 100).toFixed(2);
        const tax = (stat.tax / 100).toFixed(2);
        const net = (stat.sales / 100).toFixed(2);
        return `"${d}","${stat.count}","${sales}","${disc}","${tax}","${net}"`;
      })
      .join("\n");

    return new Response(headers + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="daily-sales-report-${days}days.csv"`,
      },
    });
  }
}
