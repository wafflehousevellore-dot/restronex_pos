import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { appCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauth" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  const outletId = req.nextUrl.searchParams.get("outletId");
  if (!tenantId) return NextResponse.json({ error: "tenant" }, { status: 400 });

  const memChk = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memChk) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const where: any = { tenantId };
  if (outletId) where.outletId = outletId;

  const tokens = await prisma.token.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(tokens);
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauth" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId || !body.outletId) return NextResponse.json({ error: "tenant/outlet required" }, { status: 400 });

  const outlet = await prisma.outlet.findFirst({ where: { id: body.outletId, tenantId } });
  if (!outlet) return NextResponse.json({ error: "Invalid outlet" }, { status: 403 });

  const count = await prisma.token.count({ where: { outletId: body.outletId, tenantId } });
  const t = await prisma.token.create({
    data: {
      tenantId,
      outletId: body.outletId,
      tokenNo: count + 1,
      queuePos: count + 1,
      status: "WAITING",
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "TOKEN_ISSUED",
      entity: "Token",
      entityId: t.id,
      metadataJson: JSON.stringify({
        outletId: body.outletId,
        tokenNo: t.tokenNo,
        customerName: body.customerName || `Guest #${t.tokenNo}`,
        partySize: body.partySize || 2,
        phone: body.phone || null,
      }),
    },
  });

  return NextResponse.json({ ok: true, token: t });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauth" }, { status: 401 });
  const body = await req.json();
  const { tokenId, status, action, tableId, waiterName } = body;
  if (!tokenId) return NextResponse.json({ error: "tokenId required" }, { status: 400 });

  const token = await prisma.token.findUnique({ where: { id: tokenId } });
  if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });

  const memChk = await prisma.membership.findFirst({ where: { userId, tenantId: token.tenantId } });
  if (!memChk) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (action === "SEAT_TOKEN" && tableId) {
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

    const [updatedToken] = await prisma.$transaction([
      prisma.token.update({
        where: { id: tokenId },
        data: { status: "COMPLETED" },
      }),
      prisma.table.update({
        where: { id: tableId },
        data: {
          status: "OCCUPIED",
          waiterName: waiterName || table.waiterName,
        },
      }),
    ]);

    appCache.delPrefix(`tables_${token.tenantId}`);

    await prisma.auditLog.create({
      data: {
        tenantId: token.tenantId,
        userId,
        action: "TOKEN_SEATED",
        entity: "Token",
        entityId: tokenId,
        metadataJson: JSON.stringify({
          tableId,
          tableNumber: table.number,
          tokenNo: token.tokenNo,
        }),
      },
    });

    return NextResponse.json({ ok: true, token: updatedToken, seatedTable: table.number });
  }

  const t = await prisma.token.update({
    where: { id: tokenId },
    data: { status: status || token.status },
  });

  return NextResponse.json({ ok: true, token: t });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauth" }, { status: 401 });
  const tokenId = req.nextUrl.searchParams.get("tokenId");
  if (!tokenId) return NextResponse.json({ error: "tokenId required" }, { status: 400 });

  const token = await prisma.token.findUnique({ where: { id: tokenId } });
  if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });

  const memChk = await prisma.membership.findFirst({ where: { userId, tenantId: token.tenantId } });
  if (!memChk) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.token.delete({ where: { id: tokenId } });
  return NextResponse.json({ ok: true, deleted: true });
}
