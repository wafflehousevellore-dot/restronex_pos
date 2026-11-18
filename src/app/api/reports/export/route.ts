import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { computeEnterpriseReport, DateRangePreset } from "@/lib/enterprise-reporting";

export const dynamic = "force-dynamic";

/**
 * Sanitizes a field against CSV formula injection (CSV injection / DDE attacks).
 * If a cell starts with =, +, -, @, tab, or carriage return, prefix it with a single quote.
 */
function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // Check for formula injection indicators
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape inner double quotes
  return `"${str.replace(/"/g, '""')}"`;
}

function buildCsvResponse(filename: string, headers: string[], rows: (string | number)[][], metadata: {
  reportTitle: string;
  tenantName: string;
  outletName: string;
  dateRange: string;
  generatedAt: string;
}): NextResponse {
  const metaLines = [
    `# RestroNex Enterprise Intelligence Report`,
    `# Report: ${metadata.reportTitle}`,
    `# Organization: ${metadata.tenantName}`,
    `# Outlet Scope: ${metadata.outletName}`,
    `# Date Period: ${metadata.dateRange}`,
    `# Generated At: ${metadata.generatedAt} (UTC)`,
    `# Confidential - For Authorized Management & Accounting Use Only`,
    ``,
  ];

  const headerLine = headers.map(sanitizeCsvCell).join(",");
  const rowLines = rows.map((r) => r.map(sanitizeCsvCell).join(","));

  const csvContent = [...metaLines, headerLine, ...rowLines].join("\n");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Missing organization context" }, { status: 400 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  const reportType = req.nextUrl.searchParams.get("type") || "sales_daily";
  const outletId = req.nextUrl.searchParams.get("outletId")?.trim() || null;
  const rangePreset = (req.nextUrl.searchParams.get("rangePreset") || "LAST_30_DAYS") as DateRangePreset;
  const startDate = req.nextUrl.searchParams.get("startDate") || undefined;
  const endDate = req.nextUrl.searchParams.get("endDate") || undefined;

  const report = await computeEnterpriseReport({
    tenantId,
    outletId,
    rangePreset,
    startDate,
    endDate,
  });

  const outletObj = outletId ? report.outlets.find((o) => o.id === outletId) : null;
  const outletName = outletObj ? outletObj.name : "All Outlets (Consolidated)";
  const meta = {
    reportTitle: reportType.toUpperCase().replace(/_/g, " "),
    tenantName: tenant?.name || "RestroNex Restaurant",
    outletName,
    dateRange: report.dateRange.label,
    generatedAt: new Date().toISOString(),
  };

  const fileDate = new Date().toISOString().slice(0, 10);

  // 1. Daily Sales
  if (reportType === "sales_daily") {
    const headers = [
      "Date",
      "Day Label",
      "Orders Count",
      "Gross Sales (Rs)",
      "Discounts (Rs)",
      "Tax Collected (Rs)",
      "Net Sales (Rs)",
    ];
    const rows = report.salesAnalytics.salesByDay.map((d) => [
      d.date,
      d.label,
      d.orders,
      (d.grossPaise / 100).toFixed(2),
      (d.discountPaise / 100).toFixed(2),
      (d.taxPaise / 100).toFixed(2),
      (d.netPaise / 100).toFixed(2),
    ]);
    return buildCsvResponse(`sales-daily-${fileDate}.csv`, headers, rows, meta);
  }

  // 2. Product Ranking
  if (reportType === "product_ranking") {
    const headers = [
      "Product Name",
      "Category",
      "Quantity Sold",
      "Gross Revenue (Rs)",
      "Revenue Share %",
      "Unit Cost (Rs)",
      "Total Food Cost (Rs)",
      "Gross Margin %",
    ];
    const rows = report.productAnalytics.topProducts.map((p) => [
      p.name,
      p.category,
      p.quantity,
      (p.revenuePaise / 100).toFixed(2),
      `${p.sharePct}%`,
      p.quantity > 0 ? (p.estimatedCogsPaise / p.quantity / 100).toFixed(2) : "0.00",
      (p.estimatedCogsPaise / 100).toFixed(2),
      p.grossMarginPct !== null ? `${p.grossMarginPct}%` : "Incomplete Recipe Data",
    ]);
    return buildCsvResponse(`product-ranking-${fileDate}.csv`, headers, rows, meta);
  }

  // 3. GST Tax Summary (GSTR-1 Ready)
  if (reportType === "gst_tax") {
    const headers = [
      "Outlet Name",
      "Taxable Value (Rs)",
      "CGST 2.5% (Rs)",
      "SGST 2.5% (Rs)",
      "Total Tax Collected (Rs)",
      "Effective Rate",
    ];
    const rows = report.gstTaxAnalytics.outletTaxSummary.map((t) => [
      t.outletName,
      (t.taxablePaise / 100).toFixed(2),
      (t.cgstPaise / 100).toFixed(2),
      (t.sgstPaise / 100).toFixed(2),
      (t.taxPaise / 100).toFixed(2),
      "5.0% GST",
    ]);
    return buildCsvResponse(`gst-tax-summary-${fileDate}.csv`, headers, rows, meta);
  }

  // 4. Day-End Z-Reports
  if (reportType === "day_end") {
    const headers = [
      "Date",
      "Outlet",
      "Orders Count",
      "Gross Sales (Rs)",
      "Petty Cash Expenses (Rs)",
      "Closed Timestamp",
    ];
    const rows = report.financialAccounting.recentDayEnds.map((d) => [
      d.date,
      d.outletName,
      d.orders,
      (d.salesPaise / 100).toFixed(2),
      (d.expensePaise / 100).toFixed(2),
      d.closedAt,
    ]);
    return buildCsvResponse(`day-end-z-reports-${fileDate}.csv`, headers, rows, meta);
  }

  // 5. Inventory Valuation
  if (reportType === "inventory_valuation") {
    const headers = [
      "Item Name",
      "Unit",
      "Current Stock",
      "Low Stock Threshold",
      "Cost Per Unit (Rs)",
      "Total Valuation (Rs)",
      "Stock Status",
    ];
    const rows = report.inventoryAnalytics.lowStockAlerts.map((i) => [
      i.name,
      i.unit,
      i.currentStock,
      i.threshold,
      (i.costPerUnitPaise / 100).toFixed(2),
      (i.valuationPaise / 100).toFixed(2),
      i.currentStock <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
    ]);
    return buildCsvResponse(`inventory-valuation-${fileDate}.csv`, headers, rows, meta);
  }

  // 6. Operating Expenses
  if (reportType === "expense_summary") {
    const headers = ["Expense Category", "Transaction Count", "Total Amount (Rs)", "Expense Share %"];
    const rows = report.financialAccounting.expenseCategories.map((e) => [
      e.category,
      e.count,
      (e.amountPaise / 100).toFixed(2),
      `${e.sharePct}%`,
    ]);
    return buildCsvResponse(`expense-summary-${fileDate}.csv`, headers, rows, meta);
  }

  // 7. Outlet Performance Leaderboard
  if (reportType === "outlet_performance") {
    const headers = [
      "Rank",
      "Outlet Name",
      "City",
      "Orders Count",
      "Gross Revenue (Rs)",
      "Average Order Value (Rs)",
      "Tax Collected (Rs)",
      "Discounts (Rs)",
      "Revenue Share %",
    ];
    const rows = report.outletPerformance.outlets.map((o) => [
      o.rank,
      o.name,
      o.city,
      o.orders,
      (o.grossSalesPaise / 100).toFixed(2),
      (o.aovPaise / 100).toFixed(2),
      (o.taxPaise / 100).toFixed(2),
      (o.discountPaise / 100).toFixed(2),
      `${o.sharePct}%`,
    ]);
    return buildCsvResponse(`outlet-performance-${fileDate}.csv`, headers, rows, meta);
  }

  // Default Fallback: Daily Sales
  const headers = ["Date", "Orders", "Gross (Rs)", "Tax (Rs)", "Net (Rs)"];
  const rows = report.salesAnalytics.salesByDay.map((d) => [
    d.date,
    d.orders,
    (d.grossPaise / 100).toFixed(2),
    (d.taxPaise / 100).toFixed(2),
    (d.netPaise / 100).toFixed(2),
  ]);
  return buildCsvResponse(`report-${fileDate}.csv`, headers, rows, meta);
}
