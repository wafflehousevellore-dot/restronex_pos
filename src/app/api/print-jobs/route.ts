import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import {
  dispatchPrintJob,
  formatThermalReceipt,
  queueAndDispatchBillPrintJob,
} from "@/lib/thermal-printer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outletId = req.nextUrl.searchParams.get("outletId");
  const where: any = { tenantId };
  if (outletId) where.outletId = outletId;

  const jobs = await prisma.printJob.findMany({
    where,
    include: {
      printer: { select: { name: true, type: true, paperWidth: true } },
      outlet: { select: { name: true } },
      order: { select: { orderNumber: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json(jobs);
}

// Trigger Test Print or Reprint Order Receipt
export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const { printerId, orderId, jobType = "TEST", paperWidth } = body;

  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (orderId) {
    const ownedOrder = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
    if (!ownedOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const res = await queueAndDispatchBillPrintJob(orderId, {
      forcePaperWidth: paperWidth === "58mm" ? "58mm" : undefined,
      baseUrl: req.nextUrl.origin,
    });
    return NextResponse.json({
      ok: res.status !== "FAILED" && res.status !== "OFFLINE" && res.status !== "NOT_CONFIGURED",
      ...res,
    });
  }

  if (!printerId) return NextResponse.json({ error: "printerId required" }, { status: 400 });

  const printer = await prisma.printerDevice.findFirst({
    where: { id: printerId, tenantId },
    include: { outlet: true, tenant: { include: { settings: true } } },
  });
  if (!printer) return NextResponse.json({ error: "Printer device not found" }, { status: 404 });

  const width: "58mm" | "80mm" =
    (paperWidth || printer.paperWidth) === "58mm" ? "58mm" : "80mm";

  const now = new Date();
  const formatted = formatThermalReceipt(
    {
      restaurantName: printer.tenant.settings?.receiptHeader || printer.tenant.name,
      outletName: printer.outlet.name,
      outletAddress: printer.outlet.address,
      outletCity: printer.outlet.city,
      outletPhone: printer.outlet.phone,
      gstin: printer.tenant.settings?.gstNumber,
      invoiceNumber: `TEST-${Date.now().toString().slice(-6)}`,
      orderNumber: "TEST-DIAG",
      dateStr: now.toLocaleDateString("en-IN"),
      timeStr: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      orderType: "DIAGNOSTIC",
      items: [
        { name: "Test Thermal Item (80/58)", quantity: 1, unitPricePaise: 10000, totalPaise: 10000 },
      ],
      subtotalPaise: 10000,
      discountPaise: 0,
      cgstPaise: 900,
      sgstPaise: 900,
      otherTaxesPaise: 0,
      totalPaise: 11800,
      paymentMethod: "TEST",
      paymentStatus: "PAID",
      transactionId: "TEST-OK",
      qrData: printer.qrEnabled ? `${req.nextUrl.origin}/app/settings/integrations` : null,
      footerText: `${printer.name} (${width} • ${printer.type})`,
    },
    width
  );

  const job = await prisma.printJob.create({
    data: {
      tenantId: printer.tenantId,
      outletId: printer.outletId,
      printerId: printer.id,
      jobType,
      paperWidth: width,
      contentJson: JSON.stringify({
        printerName: printer.name,
        printerType: printer.type,
        paperWidth: width,
        textLines: formatted.textLines,
        escPosBase64: formatted.escPosBase64,
      }),
      status: "QUEUED",
    },
  });

  const dispatchRes = await dispatchPrintJob(job.id);

  return NextResponse.json({
    ok: dispatchRes.status === "PRINTED" || dispatchRes.status === "QUEUED",
    jobId: job.id,
    status: dispatchRes.status,
    requiresClientDispatch: dispatchRes.requiresClientDispatch,
    printerType: printer.type,
    paperWidth: width,
    escPosBase64: formatted.escPosBase64,
    textLines: formatted.textLines,
    error: dispatchRes.error,
    message:
      dispatchRes.status === "PRINTED"
        ? `Printed diagnostic slip to ${printer.name} (${width}).`
        : dispatchRes.status === "OFFLINE"
        ? `Printer ${printer.name} appears offline: ${dispatchRes.error}`
        : `Print job queued for ${printer.name} (${printer.type}). Confirming hardware dispatch…`,
  });
}
