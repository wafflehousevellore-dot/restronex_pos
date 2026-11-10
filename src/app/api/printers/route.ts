import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { getPrinterCompatibility } from "@/lib/thermal-printer";

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

  const printers = await prisma.printerDevice.findMany({
    where,
    include: {
      routingRules: true,
      outlet: { select: { id: true, name: true } },
    },
    orderBy: [{ isDefaultBilling: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(
    printers.map((p) => ({
      ...p,
      compatibility: getPrinterCompatibility(p.type),
    }))
  );
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let outletId = body.outletId;
  if (!outletId) {
    const firstOutlet = await prisma.outlet.findFirst({ where: { tenantId } });
    if (!firstOutlet) return NextResponse.json({ error: "Create an outlet first" }, { status: 400 });
    outletId = firstOutlet.id;
  } else {
    const owned = await prisma.outlet.findFirst({ where: { id: outletId, tenantId } });
    if (!owned) return NextResponse.json({ error: "Invalid outlet for tenant" }, { status: 403 });
  }

  const {
    name,
    type,
    paperWidth = "80mm",
    connectionString,
    bridgeUrl,
    station = "BILLING",
    isDefaultBilling = true,
    isDefaultKOT = false,
    autoPrintEnabled = true,
    qrEnabled = true,
  } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "Printer name and connection type are required" }, { status: 400 });
  }

  const compat = getPrinterCompatibility(type);

  const printer = await prisma.$transaction(async (tx) => {
    if (isDefaultBilling) {
      await tx.printerDevice.updateMany({
        where: { tenantId, outletId, isDefaultBilling: true },
        data: { isDefaultBilling: false },
      });
    }

    const created = await tx.printerDevice.create({
      data: {
        tenantId,
        outletId,
        name: String(name).trim(),
        type,
        paperWidth: paperWidth === "58mm" ? "58mm" : "80mm",
        connectionString: connectionString?.trim() || null,
        bridgeUrl: bridgeUrl?.trim() || null,
        station,
        isDefaultBilling: Boolean(isDefaultBilling),
        isDefaultKOT: Boolean(isDefaultKOT),
        autoPrintEnabled: Boolean(autoPrintEnabled),
        qrEnabled: Boolean(qrEnabled),
        compatibilityNote: compat.limitationNote,
        status: "CONNECTED",
        lastActiveAt: new Date(),
      },
    });

    await tx.printerRoutingRule.create({
      data: {
        tenantId,
        outletId,
        printerId: created.id,
        station,
        printKOT: Boolean(isDefaultKOT) || station !== "BILLING",
        printBill: Boolean(isDefaultBilling) || station === "BILLING",
      },
    });

    await tx.restaurantSetting.upsert({
      where: { tenantId },
      create: { tenantId, autoPrintBill: true, printerOnboardingSkipped: false },
      update: { printerOnboardingSkipped: false },
    });

    return created;
  });

  return NextResponse.json({ ok: true, printer: { ...printer, compatibility: compat } });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const {
    printerId,
    isDefaultBilling,
    autoPrintEnabled,
    paperWidth,
    qrEnabled,
    status,
    name,
    connectionString,
    bridgeUrl,
  } = body;

  if (!printerId) return NextResponse.json({ error: "printerId required" }, { status: 400 });

  const printer = await prisma.printerDevice.findUnique({ where: { id: printerId } });
  if (!printer) return NextResponse.json({ error: "Printer not found" }, { status: 404 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId: printer.tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.$transaction(async (tx) => {
    if (isDefaultBilling === true) {
      await tx.printerDevice.updateMany({
        where: { tenantId: printer.tenantId, outletId: printer.outletId, isDefaultBilling: true },
        data: { isDefaultBilling: false },
      });
    }

    return tx.printerDevice.update({
      where: { id: printerId },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(connectionString !== undefined ? { connectionString: connectionString?.trim() || null } : {}),
        ...(bridgeUrl !== undefined ? { bridgeUrl: bridgeUrl?.trim() || null } : {}),
        ...(paperWidth !== undefined ? { paperWidth: paperWidth === "58mm" ? "58mm" : "80mm" } : {}),
        ...(isDefaultBilling !== undefined ? { isDefaultBilling: Boolean(isDefaultBilling) } : {}),
        ...(autoPrintEnabled !== undefined ? { autoPrintEnabled: Boolean(autoPrintEnabled) } : {}),
        ...(qrEnabled !== undefined ? { qrEnabled: Boolean(qrEnabled) } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
      },
    });
  });

  return NextResponse.json({ ok: true, printer: updated });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const printerId = req.nextUrl.searchParams.get("printerId");
  if (!printerId) return NextResponse.json({ error: "printerId required" }, { status: 400 });

  const printer = await prisma.printerDevice.findUnique({ where: { id: printerId } });
  if (!printer) return NextResponse.json({ error: "Printer not found" }, { status: 404 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId: printer.tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.printerDevice.delete({ where: { id: printerId } });
  return NextResponse.json({ ok: true, deleted: true });
}
