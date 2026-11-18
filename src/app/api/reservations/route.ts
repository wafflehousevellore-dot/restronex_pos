import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { appCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outletId = req.nextUrl.searchParams.get("outletId");
  const dateParam = req.nextUrl.searchParams.get("date");
  const statusParam = req.nextUrl.searchParams.get("status");

  const where: any = { tenantId };
  if (outletId) where.outletId = outletId;
  if (statusParam && statusParam !== "ALL") where.status = statusParam;

  if (dateParam) {
    const dayStart = new Date(dateParam);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateParam);
    dayEnd.setHours(23, 59, 59, 999);
    where.date = {
      gte: dayStart,
      lte: dayEnd,
    };
  }

  const list = await prisma.reservation.findMany({
    where,
    include: {
      outlet: { select: { id: true, name: true, city: true } },
    },
    orderBy: { date: "asc" },
    take: 100,
  });

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId || !body.outletId) return NextResponse.json({ error: "Outlet required" }, { status: 400 });

  const outlet = await prisma.outlet.findFirst({ where: { id: body.outletId, tenantId } });
  if (!outlet) return NextResponse.json({ error: "Invalid outlet" }, { status: 403 });

  const partySize = parseInt(String(body.partySize || "2"), 10) || 2;
  const bookingDate = body.date ? new Date(body.date) : new Date();

  const reservation = await prisma.reservation.create({
    data: {
      tenantId,
      outletId: body.outletId,
      name: (body.name || "Guest").trim(),
      phone: (body.phone || "").trim(),
      partySize,
      date: bookingDate,
      status: "BOOKED",
    },
    include: {
      outlet: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "RESERVATION_CREATED",
      entity: "Reservation",
      entityId: reservation.id,
      metadataJson: JSON.stringify({
        outletId: body.outletId,
        partySize,
        name: body.name,
        notes: body.notes || null,
        areaPreference: body.areaPreference || null,
      }),
    },
  });

  return NextResponse.json({ ok: true, reservation });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const { reservationId, status, action, tableId, waiterName } = body;
  if (!reservationId) return NextResponse.json({ error: "reservationId required" }, { status: 400 });

  const existing = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!existing) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId: existing.tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Handle Seating reservation at table
  if (action === "SEAT_RESERVATION" && tableId) {
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

    const [updatedRes] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id: reservationId },
        data: { status: "SEATED" },
      }),
      prisma.table.update({
        where: { id: tableId },
        data: {
          status: "OCCUPIED",
          waiterName: waiterName || table.waiterName,
        },
      }),
    ]);

    appCache.delPrefix(`tables_${existing.tenantId}`);

    await prisma.auditLog.create({
      data: {
        tenantId: existing.tenantId,
        userId,
        action: "RESERVATION_SEATED",
        entity: "Reservation",
        entityId: reservationId,
        metadataJson: JSON.stringify({
          tableId,
          tableNumber: table.number,
          guestName: existing.name,
        }),
      },
    });

    return NextResponse.json({ ok: true, reservation: updatedRes, seatedTable: table.number });
  }

  // Standard status update
  const updated = await prisma.reservation.update({
    where: { id: reservationId },
    data: { status: status || existing.status },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: existing.tenantId,
      userId,
      action: "RESERVATION_STATUS_UPDATED",
      entity: "Reservation",
      entityId: reservationId,
      metadataJson: JSON.stringify({ status: updated.status }),
    },
  });

  return NextResponse.json({ ok: true, reservation: updated });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const reservationId = req.nextUrl.searchParams.get("reservationId");
  if (!reservationId) return NextResponse.json({ error: "reservationId required" }, { status: 400 });

  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!reservation) return NextResponse.json({ error: "Reservation not found" }, { status: 404 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId: reservation.tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.reservation.delete({ where: { id: reservationId } });

  return NextResponse.json({ ok: true, deleted: true });
}
