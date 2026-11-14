import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { closeOutletDayEnd } from "@/lib/day-end-service";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const memChk = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memChk) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rawOutletId = req.nextUrl.searchParams.get("outletId")?.trim() || null;
  const outletId = rawOutletId && rawOutletId !== "ALL" ? rawOutletId : null;

  const list = await prisma.dayEndSummary.findMany({
    where: {
      tenantId,
      ...(outletId ? { outletId } : {}),
    },
    include: { outlet: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
    take: 30,
  });

  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let body: {
    tenantId?: string;
    outletId?: string;
    date?: string;
    openingFloatPaise?: string | number;
    countedCashPaise?: string | number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId || !body.outletId) {
    return NextResponse.json({ error: "outletId required" }, { status: 400 });
  }

  const memChk = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memChk) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const openingFloatPaise =
    body.openingFloatPaise !== undefined && body.openingFloatPaise !== ""
      ? parseInt(String(body.openingFloatPaise), 10)
      : 0;
  const countedCashPaise =
    body.countedCashPaise !== undefined && body.countedCashPaise !== ""
      ? parseInt(String(body.countedCashPaise), 10)
      : null;

  const result = await closeOutletDayEnd({
    tenantId,
    outletId: body.outletId,
    userId,
    date: body.date,
    openingFloatPaise: Number.isFinite(openingFloatPaise) ? openingFloatPaise : 0,
    countedCashPaise:
      countedCashPaise !== null && Number.isFinite(countedCashPaise)
        ? countedCashPaise
        : null,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ summary: result.summary, zReport: result.zReport });
}
