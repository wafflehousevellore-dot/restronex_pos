import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(printers);
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
  }

  const {
    name,
    type,
    paperWidth = "80mm",
    connectionString,
    station = "MAIN",
    isDefaultBilling = false,
    isDefaultKOT = false,
  } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "Printer name and type are required" }, { status: 400 });
  }

  const printer = await prisma.printerDevice.create({
    data: {
      tenantId,
      outletId,
      name,
      type, // BLUETOOTH_THERMAL, USB_THERMAL, NETWORK_LAN, CLOUD_PRINT
      paperWidth, // 58mm, 80mm
      connectionString: connectionString || null,
      station,
      isDefaultBilling,
      isDefaultKOT,
      status: "CONNECTED",
      lastActiveAt: new Date(),
    },
  });

  // Create default routing rule
  await prisma.printerRoutingRule.create({
    data: {
      tenantId,
      outletId,
      printerId: printer.id,
      station,
      printKOT: isDefaultKOT || station !== "BILLING",
      printBill: isDefaultBilling || station === "BILLING",
    },
  });

  return NextResponse.json({ ok: true, printer });
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
