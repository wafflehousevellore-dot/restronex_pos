import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { appCache, getOrSetCache } from "@/lib/cache";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outletId = req.nextUrl.searchParams.get("outletId");
  const cacheKey = `tables_${tenantId}_${outletId || "all"}`;

  const enriched = await getOrSetCache(
    cacheKey,
    async () => {
      const where: any = { tenantId };
      if (outletId) where.outletId = outletId;

      const tables = await prisma.table.findMany({
        where,
        include: {
          outlet: { select: { id: true, name: true, slug: true } },
          tenant: { select: { id: true, name: true } },
          orders: {
            where: {
              status: { in: ["OPEN", "PLACED", "PREPARING", "READY", "SERVED", "BILLED"] },
            },
            include: {
              items: {
                include: {
                  addons: true,
                },
              },
              payments: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { number: "asc" },
      });

      return tables.map((t) => {
        let token = t.qrToken;
        if (!token) {
          token = `tbl_${crypto.randomBytes(6).toString("hex")}`;
          // fire-and-forget token update to not block response
          prisma.table.update({ where: { id: t.id }, data: { qrToken: token } }).catch(() => {});
        }

        const activeOrder = t.orders && t.orders.length > 0 ? t.orders[0] : null;
        const liveTotalPaise = activeOrder ? activeOrder.totalPaise : t.orderTotalPaise;

        return {
          ...t,
          qrToken: token,
          activeOrder,
          orderTotalPaise: liveTotalPaise,
        };
      });
    },
    8
  );

  const res = NextResponse.json(enriched);
  res.headers.set("Cache-Control", "private, s-maxage=5, stale-while-revalidate=15");
  return res;
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
      qrOrderingEnabled: body.qrOrderingEnabled !== false,
      waiterName: body.waiterName || null,
    },
  });

  appCache.delPrefix(`tables_${tenantId}`);

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
  const { tableId, status, waiterName, area, capacity, number, qrOrderingEnabled, action, targetTableId } = body;
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
          waiterName: table.waiterName || targetTable.waiterName,
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
        where: { tableId, status: { in: ["OPEN", "BILLED", "PLACED", "PREPARING", "READY", "SERVED"] } },
        data: { tableId: targetTableId },
      }),
    ]);

    appCache.delPrefix(`tables_${table.tenantId}`);

    await prisma.auditLog.create({
      data: {
        tenantId: table.tenantId,
        userId,
        action: "TABLE_ORDER_MOVED",
        entity: "Table",
        entityId: tableId,
        metadataJson: JSON.stringify({ from: table.number, to: targetTable.number }),
      },
    });

    return NextResponse.json({ ok: true, moved: true, from: table.number, to: targetTable.number });
  }

  // Handle Merge Tables
  if (action === "MERGE_TABLES" && targetTableId) {
    const targetTable = await prisma.table.findUnique({ where: { id: targetTableId } });
    if (!targetTable) return NextResponse.json({ error: "Target table not found" }, { status: 404 });

    const combinedTotalPaise = (targetTable.orderTotalPaise || 0) + (table.orderTotalPaise || 0);

    await prisma.$transaction([
      prisma.table.update({
        where: { id: targetTableId },
        data: {
          status: "OCCUPIED",
          orderTotalPaise: combinedTotalPaise,
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
        where: { tableId, status: { in: ["OPEN", "BILLED", "PLACED", "PREPARING", "READY", "SERVED"] } },
        data: { tableId: targetTableId },
      }),
    ]);

    appCache.delPrefix(`tables_${table.tenantId}`);

    await prisma.auditLog.create({
      data: {
        tenantId: table.tenantId,
        userId,
        action: "TABLES_MERGED",
        entity: "Table",
        entityId: targetTableId,
        metadataJson: JSON.stringify({ source: table.number, target: targetTable.number }),
      },
    });

    return NextResponse.json({ ok: true, merged: true, source: table.number, target: targetTable.number });
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

    appCache.delPrefix(`tables_${table.tenantId}`);

    await prisma.auditLog.create({
      data: {
        tenantId: table.tenantId,
        userId,
        action: "TABLE_CLOSED",
        entity: "Table",
        entityId: tableId,
        metadataJson: JSON.stringify({ number: table.number }),
      },
    });

    return NextResponse.json({ ok: true, table: updated });
  }

  // General Update / Edit
  const data: any = {};
  if (status) data.status = status;
  if (waiterName !== undefined) data.waiterName = waiterName;
  if (area) data.area = area.trim();
  if (number) data.number = number.trim();
  if (capacity) data.capacity = parseInt(String(capacity), 10);
  if (qrOrderingEnabled !== undefined) data.qrOrderingEnabled = Boolean(qrOrderingEnabled);

  const updated = await prisma.table.update({
    where: { id: tableId },
    data,
  });

  appCache.delPrefix(`tables_${table.tenantId}`);

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

  if (table.status === "OCCUPIED" || table.status === "BILLING" || table.status === "BILLED") {
    return NextResponse.json({ error: "Cannot delete an occupied or billed table" }, { status: 400 });
  }

  await prisma.table.delete({ where: { id: tableId } });
  appCache.delPrefix(`tables_${table.tenantId}`);

  await prisma.auditLog.create({
    data: {
      tenantId: table.tenantId,
      userId,
      action: "TABLE_DELETED",
      entity: "Table",
      entityId: tableId,
      metadataJson: JSON.stringify({ number: table.number }),
    },
  });

  return NextResponse.json({ ok: true, deleted: true });
}
