import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { BulkSalesService } from "@/lib/inventory/bulk-sales-service";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  const invoiceNumber = req.nextUrl.searchParams.get("invoiceNumber");

  try {
    // Single detail request (for viewing / printing / downloading invoice)
    if (id || invoiceNumber) {
      const sale = await BulkSalesService.getBulkSaleDetail(tenantId, (id || invoiceNumber)!);
      if (!sale) {
        return NextResponse.json({ error: "Bulk sale record not found" }, { status: 404 });
      }
      return NextResponse.json(sale);
    }

    // List query
    const outletId = req.nextUrl.searchParams.get("outletId") || undefined;
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const search = req.nextUrl.searchParams.get("search") || undefined;
    const startDate = req.nextUrl.searchParams.get("startDate") || undefined;
    const endDate = req.nextUrl.searchParams.get("endDate") || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;

    const sales = await BulkSalesService.listBulkSales({
      tenantId,
      outletId,
      status,
      search,
      startDate,
      endDate,
      limit,
      cursor,
    });

    return NextResponse.json(sales);
  } catch (err: any) {
    console.error("[BulkSales GET Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to load bulk sales" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const sale = await BulkSalesService.createBulkSale({
      tenantId,
      outletId: body.outletId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerGstin: body.customerGstin,
      customerAddress: body.customerAddress,
      items: body.items,
      paymentMethod: body.paymentMethod,
      paymentStatus: body.paymentStatus,
      notes: body.notes,
      terms: body.terms,
      isDraft: Boolean(body.isDraft),
      userId,
    });

    return NextResponse.json({
      ok: true,
      bulkSale: sale,
      invoiceNumber: sale.invoiceNumber,
    });
  } catch (err: any) {
    console.error("[BulkSales POST Error]:", err);
    const isClientError =
      err.name === "InsufficientStockError" ||
      err.message.includes("Insufficient") ||
      err.message.includes("not found");
    return NextResponse.json(
      { error: err.message || "Failed to create bulk sale" },
      { status: isClientError ? 400 : 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const { bulkSaleId, action, reason } = body;

  if (!bulkSaleId) {
    return NextResponse.json({ error: "bulkSaleId is required" }, { status: 400 });
  }

  const existing = await prisma.bulkSale.findUnique({ where: { id: bulkSaleId } });
  if (!existing) return NextResponse.json({ error: "Bulk sale not found" }, { status: 404 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId: existing.tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    if (action === "CONFIRM_DRAFT") {
      const updated = await BulkSalesService.confirmDraftSale(existing.tenantId, bulkSaleId, userId);
      return NextResponse.json({ ok: true, bulkSale: updated });
    }

    if (action === "CANCEL" || action === "REFUND") {
      const statusTarget = action === "CANCEL" ? "CANCELLED" : "REFUNDED";
      const updated = await BulkSalesService.cancelOrRefundSale(
        existing.tenantId,
        bulkSaleId,
        statusTarget,
        reason || "Reversal requested by cashier",
        userId
      );
      return NextResponse.json({ ok: true, bulkSale: updated });
    }

    if (action === "UPDATE_PAYMENT") {
      const updated = await prisma.bulkSale.update({
        where: { id: bulkSaleId },
        data: {
          paymentStatus: body.paymentStatus || existing.paymentStatus,
          paymentMethod: body.paymentMethod || existing.paymentMethod,
        },
      });
      return NextResponse.json({ ok: true, bulkSale: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[BulkSales PATCH Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to update bulk sale" }, { status: 500 });
  }
}
