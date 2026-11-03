import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outletId = req.nextUrl.searchParams.get("outletId");
  const where: any = { tenantId };
  if (outletId) where.outletId = outletId;

  const tables = await prisma.table.findMany({
    where,
    include: {
      outlet: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { number: "asc" },
  });

  // Ensure every table has a unique qrToken
  const enriched = await Promise.all(
    tables.map(async (t) => {
      if (!t.qrToken) {
        const token = `tbl_${crypto.randomBytes(6).toString("hex")}`;
        await prisma.table.update({ where: { id: t.id }, data: { qrToken: token } });
        return { ...t, qrToken: token };
      }
      return t;
    })
  );

  return NextResponse.json(enriched);
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

  const number = (body.number || `T${Date.now().toString().slice(-2)}`).trim();
  const area = (body.area || "Main Hall").trim();
  const capacity = parseInt(body.capacity || "4", 10) || 4;
  const qrToken = `tbl_${crypto.randomBytes(6).toString("hex")}`;

  const existing = await prisma.table.findFirst({ where: { outletId, number } });
  if (existing) {
    return NextResponse.json({ error: `Table ${number} already exists in this outlet` }, { status: 400 });
  }

  const table = await prisma.table.create({
    data: {
      tenantId,
      outletId,
      number,
      area,
      capacity,
      status: "AVAILABLE",
      qrToken,
      qrOrderingEnabled: true,
      waiterName: body.waiterName || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "TABLE_CREATED",
      entity: "Table",
      entityId: table.id,
      metadataJson: JSON.stringify({ number, area, capacity }),
    },
  });

  return NextResponse.json({ ok: true, table });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const { tableId, status, waiterName, area, capacity, action, targetTableId } = body;
  if (!tableId) return NextResponse.json({ error: "tableId required" }, { status: 400 });

  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId: table.tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Handle Shift / Move order to another table
  if (action === "MOVE_ORDER" && targetTableId) {
    const targetTable = await prisma.table.findUnique({ where: { id: targetTableId } });
    if (!targetTable) return NextResponse.json({ error: "Target table not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.table.update({
        where: { id: targetTableId },
        data: {
          status: "OCCUPIED",
          currentOrderId: table.currentOrderId,
          orderTotalPaise: table.orderTotalPaise,
        },
      }),
      prisma.table.update({
        where: { id: tableId },
        data: {
          status: "AVAILABLE",
          currentOrderId: null,
          orderTotalPaise: 0,
        },
      }),
      prisma.order.updateMany({
        where: { tableId, status: { in: ["OPEN", "BILLED", "PLACED", "PREPARING"] } },
        data: { tableId: targetTableId },
      }),
    ]);

    return NextResponse.json({ ok: true, moved: true, from: table.number, to: targetTable.number });
  }

  // Handle Close / Clean Table
  if (action === "CLOSE_TABLE") {
    const updated = await prisma.table.update({
      where: { id: tableId },
      data: {
        status: "AVAILABLE",
        currentOrderId: null,
        orderTotalPaise: 0,
        waiterName: null,
      },
    });
    return NextResponse.json({ ok: true, table: updated });
  }

  // General Update
  const data: any = {};
  if (status) data.status = status;
  if (waiterName !== undefined) data.waiterName = waiterName;
  if (area) data.area = area;
  if (capacity) data.capacity = parseInt(capacity, 10);

  const updated = await prisma.table.update({
    where: { id: tableId },
    data,
  });

  return NextResponse.json({ ok: true, table: updated });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tableId = req.nextUrl.searchParams.get("tableId");
  if (!tableId) return NextResponse.json({ error: "tableId required" }, { status: 400 });

  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId: table.tenantId } });
  if (!mem || mem.role !== "OWNER") return NextResponse.json({ error: "Only owners can delete tables" }, { status: 403 });

  if (table.status === "OCCUPIED" || table.status === "BILLING") {
    return NextResponse.json({ error: "Cannot delete an occupied table" }, { status: 400 });
  }

  await prisma.table.delete({ where: { id: tableId } });
  return NextResponse.json({ ok: true, deleted: true });
}
