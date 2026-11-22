import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { recordStockMovement } from "@/lib/inventory/stock-ledger";

function generateTransferNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TR-${dateStr}-${rand}`;
}

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const outletId = req.nextUrl.searchParams.get("outletId");
  const status = req.nextUrl.searchParams.get("status");

  const where: any = { tenantId };
  if (status && status !== "ALL") where.status = status;
  if (outletId && outletId !== "ALL") {
    where.OR = [{ fromOutletId: outletId }, { toOutletId: outletId }];
  }

  const transfers = await prisma.stockTransfer.findMany({
    where,
    include: {
      fromOutlet: { select: { id: true, name: true, city: true } },
      toOutlet: { select: { id: true, name: true, city: true } },
      items: {
        include: {
          inventoryItem: { select: { id: true, name: true, unit: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(transfers);
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const { fromOutletId, toOutletId, items, notes } = body;

  if (!fromOutletId || !toOutletId) {
    return NextResponse.json({ error: "Source and destination outlets are required" }, { status: 400 });
  }
  if (fromOutletId === toOutletId) {
    return NextResponse.json({ error: "Cannot transfer stock to the same outlet" }, { status: 400 });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Transfer must contain at least one item" }, { status: 400 });
  }

  const transferNumber = generateTransferNumber();

  const transfer = await prisma.$transaction(async (tx) => {
    const created = await tx.stockTransfer.create({
      data: {
        tenantId,
        transferNumber,
        fromOutletId,
        toOutletId,
        status: "PENDING",
        notes: notes?.trim() || null,
        createdById: userId,
      },
    });

    for (const it of items) {
      await tx.stockTransferItem.create({
        data: {
          transferId: created.id,
          inventoryItemId: it.inventoryItemId,
          quantity: Math.abs(parseFloat(it.quantity || "0")),
          unit: it.unit || "PCS",
        },
      });
    }

    return created;
  });

  return NextResponse.json({ ok: true, transfer });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const { transferId, action, reason } = body;

  if (!transferId) {
    return NextResponse.json({ error: "transferId required" }, { status: 400 });
  }

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: transferId },
    include: {
      items: {
        include: { inventoryItem: true },
      },
    },
  });

  if (!transfer) return NextResponse.json({ error: "Transfer not found" }, { status: 404 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId: transfer.tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const now = new Date();

    if (action === "DISPATCH") {
      // Deduct from source outlet via Stock Ledger
      const updated = await prisma.$transaction(async (tx) => {
        for (const it of transfer.items) {
          await recordStockMovement(tx, {
            tenantId: transfer.tenantId,
            outletId: transfer.fromOutletId,
            inventoryItemId: it.inventoryItemId,
            type: "TRANSFER_OUT",
            quantity: -it.quantity,
            unit: it.unit,
            reference: `Transfer #${transfer.transferNumber} DISPATCH to outlet`,
            userId,
          });
        }

        return await tx.stockTransfer.update({
          where: { id: transfer.id },
          data: {
            status: "DISPATCHED",
            dispatchedAt: now,
          },
        });
      });

      return NextResponse.json({ ok: true, transfer: updated });
    }

    if (action === "RECEIVE") {
      // Add into destination outlet via Stock Ledger
      const updated = await prisma.$transaction(async (tx) => {
        for (const it of transfer.items) {
          await recordStockMovement(tx, {
            tenantId: transfer.tenantId,
            outletId: transfer.toOutletId,
            inventoryItemId: it.inventoryItemId,
            type: "TRANSFER_IN",
            quantity: it.quantity,
            unit: it.unit,
            reference: `Transfer #${transfer.transferNumber} RECEIVED from outlet`,
            userId,
          });
        }

        return await tx.stockTransfer.update({
          where: { id: transfer.id },
          data: {
            status: "RECEIVED",
            receivedAt: now,
            receivedById: userId,
          },
        });
      });

      return NextResponse.json({ ok: true, transfer: updated });
    }

    if (action === "REJECT" || action === "CANCEL") {
      const updated = await prisma.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: action === "REJECT" ? "REJECTED" : "CANCELLED",
          notes: transfer.notes ? `${transfer.notes}\n[${action}]: ${reason || ""}` : `[${action}]: ${reason || ""}`,
        },
      });

      return NextResponse.json({ ok: true, transfer: updated });
    }

    return NextResponse.json({ error: "Invalid transfer action" }, { status: 400 });
  } catch (err: any) {
    console.error("[StockTransfer PATCH Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to update transfer" }, { status: 500 });
  }
}
