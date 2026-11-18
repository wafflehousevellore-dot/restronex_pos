import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export interface StaffShiftItem {
  id: string;
  tenantId: string;
  outletId: string;
  outletName?: string;
  membershipId: string;
  employeeName: string;
  employeeCode?: string;
  role: string;
  shiftName: "Morning" | "Evening" | "Night" | "Full Day" | "Custom";
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  breakMinutes?: number;
  status: "SCHEDULED" | "ACTIVE" | "COMPLETED" | "MISSED" | "CANCELLED";
  notes?: string;
  // Cashier Drawer attributes
  cashierShiftId?: string | null;
  openingPaise?: number;
  closingPaise?: number | null;
  cashSalesPaise?: number;
  cardSalesPaise?: number;
  upiSalesPaise?: number;
  expectedCashPaise?: number;
  cashDifferencePaise?: number;
  reconciliationNotes?: string;
  createdAt: string;
}

const SHIFTS_PROVIDER = "staff_shifts_roster";

/**
 * GET /api/staff/shifts?outletId=...&date=...
 * Retrieves scheduled shifts and active cashier shifts for the tenant.
 */
export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const outletId = req.nextUrl.searchParams.get("outletId");
  const dateParam = req.nextUrl.searchParams.get("date"); // YYYY-MM-DD or empty for all

  // Load shifts config / roster
  const config = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: SHIFTS_PROVIDER } },
  });

  let shifts: StaffShiftItem[] = [];
  if (config?.configJson) {
    try {
      shifts = JSON.parse(config.configJson);
    } catch {
      shifts = [];
    }
  }

  // Load CashierShifts to sync live register statuses
  const cashierShifts = await prisma.cashierShift.findMany({
    where: {
      tenantId,
      ...(outletId ? { outletId } : {}),
    },
    include: {
      outlet: { select: { id: true, name: true } },
    },
    orderBy: { openedAt: "desc" },
    take: 50,
  });

  // Filter shifts by outlet if specified
  if (outletId) {
    shifts = shifts.filter((s) => s.outletId === outletId);
  }

  // Filter shifts by date if specified
  if (dateParam) {
    shifts = shifts.filter((s) => s.scheduledDate === dateParam);
  }

  return NextResponse.json({
    ok: true,
    shifts,
    cashierShifts,
  });
}

/**
 * POST /api/staff/shifts
 * Schedule a new staff shift or open a cashier drawer register.
 */
export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const currentMembership = await prisma.membership.findFirst({
    where: { userId, tenantId },
  });
  if (!currentMembership || (currentMembership.role !== "OWNER" && currentMembership.role !== "MANAGER" && currentMembership.role !== "HEAD_OFFICE")) {
    return NextResponse.json({ error: "Insufficient permissions to schedule shifts" }, { status: 403 });
  }

  const {
    outletId,
    membershipId,
    employeeName,
    employeeCode,
    role,
    shiftName = "Morning",
    scheduledDate,
    startTime = "09:00",
    endTime = "17:00",
    notes,
    isCashierShift = false,
    openingPaise = 0,
  } = body;

  if (!outletId || !membershipId || !scheduledDate) {
    return NextResponse.json({ error: "Outlet, staff member, and date are required" }, { status: 400 });
  }

  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true, name: true },
  });

  let cashierShiftId: string | null = null;
  if (isCashierShift) {
    // Open a cashier register shift in DB
    const cs = await prisma.cashierShift.create({
      data: {
        tenantId,
        outletId,
        openedById: userId,
        openingPaise: Number(openingPaise) || 0,
        status: "OPEN",
        openedAt: new Date(),
      },
    });
    cashierShiftId = cs.id;
  }

  const shiftId = `shift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newShift: StaffShiftItem = {
    id: shiftId,
    tenantId,
    outletId,
    outletName: outlet?.name || "Main Outlet",
    membershipId,
    employeeName: employeeName || "Staff Member",
    employeeCode: employeeCode || undefined,
    role: role || "STAFF",
    shiftName,
    scheduledDate,
    startTime,
    endTime,
    status: isCashierShift ? "ACTIVE" : "SCHEDULED",
    actualStartTime: isCashierShift ? new Date().toISOString() : null,
    notes: notes || undefined,
    cashierShiftId,
    openingPaise: Number(openingPaise) || 0,
    createdAt: new Date().toISOString(),
  };

  // Upsert roster in IntegrationConfig
  const existingConfig = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: SHIFTS_PROVIDER } },
  });

  let roster: StaffShiftItem[] = [];
  if (existingConfig?.configJson) {
    try {
      roster = JSON.parse(existingConfig.configJson);
    } catch {
      roster = [];
    }
  }

  roster.unshift(newShift);
  // Keep last 500 shift records
  if (roster.length > 500) roster = roster.slice(0, 500);

  await prisma.integrationConfig.upsert({
    where: { tenantId_provider: { tenantId, provider: SHIFTS_PROVIDER } },
    create: {
      tenantId,
      provider: SHIFTS_PROVIDER,
      status: "ACTIVE",
      configJson: JSON.stringify(roster),
      lastSyncAt: new Date(),
    },
    update: {
      configJson: JSON.stringify(roster),
      lastSyncAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: isCashierShift ? "CASHIER_SHIFT_OPENED" : "STAFF_SHIFT_SCHEDULED",
      entity: "StaffShift",
      entityId: shiftId,
      metadataJson: JSON.stringify({
        outletId,
        employeeName,
        shiftName,
        scheduledDate,
        startTime,
        endTime,
        openingPaise,
      }),
    },
  });

  return NextResponse.json({ ok: true, shift: newShift });
}

/**
 * PATCH /api/staff/shifts
 * Update shift status (Start, Break, End) or close cashier shift drawer with cash count.
 */
export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const {
    shiftId,
    status,
    breakMinutes,
    closingPaise,
    cashSalesPaise,
    cardSalesPaise,
    upiSalesPaise,
    expectedCashPaise,
    cashDifferencePaise,
    reconciliationNotes,
  } = body;

  if (!shiftId) {
    return NextResponse.json({ error: "shiftId is required" }, { status: 400 });
  }

  const existingMembership = await prisma.membership.findFirst({
    where: { userId },
  });
  if (!existingMembership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = existingMembership.tenantId;

  const existingConfig = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: SHIFTS_PROVIDER } },
  });

  let roster: StaffShiftItem[] = [];
  if (existingConfig?.configJson) {
    try {
      roster = JSON.parse(existingConfig.configJson);
    } catch {
      roster = [];
    }
  }

  const shiftIndex = roster.findIndex((s) => s.id === shiftId);
  if (shiftIndex === -1) {
    return NextResponse.json({ error: "Shift record not found" }, { status: 404 });
  }

  const targetShift = roster[shiftIndex];

  if (status) {
    targetShift.status = status;
    if (status === "ACTIVE" && !targetShift.actualStartTime) {
      targetShift.actualStartTime = new Date().toISOString();
    }
    if (status === "COMPLETED" && !targetShift.actualEndTime) {
      targetShift.actualEndTime = new Date().toISOString();
    }
  }

  if (breakMinutes !== undefined) {
    targetShift.breakMinutes = (targetShift.breakMinutes || 0) + Number(breakMinutes);
  }

  // Cashier Drawer Close
  if (closingPaise !== undefined) {
    targetShift.closingPaise = Number(closingPaise);
    targetShift.cashSalesPaise = Number(cashSalesPaise) || 0;
    targetShift.cardSalesPaise = Number(cardSalesPaise) || 0;
    targetShift.upiSalesPaise = Number(upiSalesPaise) || 0;
    targetShift.expectedCashPaise = Number(expectedCashPaise) || 0;
    targetShift.cashDifferencePaise = Number(cashDifferencePaise) || 0;
    targetShift.reconciliationNotes = reconciliationNotes || undefined;
    targetShift.status = "COMPLETED";
    targetShift.actualEndTime = new Date().toISOString();

    if (targetShift.cashierShiftId) {
      await prisma.cashierShift.update({
        where: { id: targetShift.cashierShiftId },
        data: {
          closingPaise: Number(closingPaise),
          status: "CLOSED",
          closedAt: new Date(),
        },
      }).catch(() => {});
    }
  }

  roster[shiftIndex] = targetShift;

  await prisma.integrationConfig.update({
    where: { tenantId_provider: { tenantId, provider: SHIFTS_PROVIDER } },
    data: {
      configJson: JSON.stringify(roster),
      lastSyncAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: closingPaise !== undefined ? "CASHIER_SHIFT_CLOSED" : `STAFF_SHIFT_${status || "UPDATED"}`,
      entity: "StaffShift",
      entityId: shiftId,
      metadataJson: JSON.stringify({
        status: targetShift.status,
        closingPaise,
        cashDifferencePaise,
        employeeName: targetShift.employeeName,
      }),
    },
  });

  return NextResponse.json({ ok: true, shift: targetShift });
}
