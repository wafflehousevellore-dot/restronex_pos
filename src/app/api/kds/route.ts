import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { appCache, getOrSetCache } from "@/lib/cache";
import {
  acknowledgeKitchenTicket,
  updateKitchenTicketStatus,
} from "@/lib/order-ingestion";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const memChk = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memChk) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outletId = req.nextUrl.searchParams.get("outletId");
  const station = req.nextUrl.searchParams.get("station");
  const status = req.nextUrl.searchParams.get("status");

  const whereClause: any = { tenantId };
  if (outletId) whereClause.outletId = outletId;
  if (station && station !== "ALL") whereClause.station = station;
  if (status && status !== "ALL") whereClause.status = status;

  // Single-flight coalescing cache (3s TTL) across all KDS screens in this outlet/station
  const cacheKey = `kds_${tenantId}_${outletId || "ALL"}_${station || "ALL"}_${status || "ALL"}`;
  const tickets = await getOrSetCache(
    cacheKey,
    async () => {
      return prisma.kitchenTicket.findMany({
        where: whereClause,
        include: {
          order: {
            include: {
              items: {
                include: {
                  addons: true,
                },
              },
              table: { select: { id: true, number: true, area: true } },
              payments: { orderBy: { createdAt: "desc" }, take: 1 },
            },
          },
        },
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        take: 80,
      });
    },
    3
  );

  // ETag conditional check (prevents redundant JSON serialization & payload bandwidth if unchanged)
  const hashPayload = tickets
    .map((t: any) => `${t.id}:${t.status}:${t.updatedAt instanceof Date ? t.updatedAt.getTime() : t.updatedAt || ""}`)
    .join(";");
  const etag = `"${crypto.createHash("md5").update(hashPayload).digest("hex")}"`;

  const clientEtag = req.headers.get("if-none-match");
  if (clientEtag && clientEtag === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "private, no-cache",
      },
    });
  }

  const res = NextResponse.json(tickets);
  res.headers.set("ETag", etag);
  res.headers.set("Cache-Control", "private, no-cache");
  return res;
}

export async function PATCH(req: NextRequest) {
  const { userId, user } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const { ticketId, status, action } = body;
  if (!ticketId) {
    return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
  }

  // 1. Acknowledge Ticket
  if (action === "ACKNOWLEDGE" || action === "ACK") {
    const res = await acknowledgeKitchenTicket({
      ticketId,
      tenantId,
      userId,
      userName: user?.name || "Kitchen Staff",
    });
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }
    appCache.delPrefix(`kds_${tenantId}`);
    return NextResponse.json(res.ticket);
  }

  // 2. Reprint KOT
  if (action === "REPRINT_KOT") {
    const ticket = await prisma.kitchenTicket.findFirst({
      where: { id: ticketId, tenantId },
      include: {
        order: {
          include: {
            items: {
              include: {
                addons: true,
              },
            },
            table: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const updated = await prisma.kitchenTicket.update({
      where: { id: ticketId },
      data: { reprintCount: { increment: 1 } },
    });

    // Create Reprint Print Job
    const order = ticket.order;
    const kotLines = [
      "========================================",
      "     ** KOT REPRINT / DUPLICATE **      ",
      "========================================",
      `Order: ${order.orderNumber}  Source: ${order.type}`,
      `Type:  ${order.serviceMode}  Station: ${ticket.station}`,
      `Reprint #: ${updated.reprintCount}`,
      `Time:  ${new Date().toLocaleTimeString("en-IN")}`,
      ...(order.table?.number ? [`Table: ${order.table.number}`] : []),
      "----------------------------------------",
      ...order.items.map((it) => `${it.name.padEnd(28, " ")} ×${it.quantity}`),
      "----------------------------------------",
      ...(order.notes ? [`NOTE: ${order.notes}`, "----------------------------------------"] : []),
      "========================================",
    ].join("\n");

    await prisma.printJob.create({
      data: {
        tenantId,
        outletId: ticket.outletId,
        orderId: order.id,
        idempotencyKey: `kot_reprint_${ticket.id}_${updated.reprintCount}`,
        jobType: "KOT",
        paperWidth: "80mm",
        contentJson: JSON.stringify({
          ticketId: ticket.id,
          orderNumber: order.orderNumber,
          isReprint: true,
          reprintCount: updated.reprintCount,
          textPlain: kotLines,
        }),
        status: "QUEUED",
      },
    });

    return NextResponse.json({ ok: true, ticket: updated, message: "KOT reprint queued" });
  }

  // 3. Update Status (RECEIVED -> ACCEPTED -> PREPARING -> READY -> COMPLETED)
  if (status) {
    const res = await updateKitchenTicketStatus({
      ticketId,
      tenantId,
      status,
      userName: user?.name,
    });
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }
    appCache.delPrefix(`kds_${tenantId}`);
    return NextResponse.json(res.ticket);
  }

  return NextResponse.json({ error: "Invalid action or status parameter" }, { status: 400 });
}
