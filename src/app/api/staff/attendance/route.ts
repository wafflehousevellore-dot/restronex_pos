import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export interface AttendanceItem {
  id: string;
  tenantId: string;
  outletId: string;
  outletName?: string;
  membershipId: string;
  employeeName: string;
  employeeCode?: string;
  role: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // ISO
  checkOutTime?: string | null; // ISO
  status: "PRESENT" | "LATE" | "HALF_DAY" | "ABSENT";
  checkInMethod: "SELF_POS" | "PIN" | "MANAGER_LOG" | "QR_CODE";
  shiftName?: string;
  hoursWorked?: number;
  notes?: string;
  verifiedBy?: string;
  createdAt: string;
}

const ATTENDANCE_PROVIDER = "staff_attendance_ledger";

/**
 * GET /api/staff/attendance?outletId=...&date=...&export=true
 * Retrieves attendance punch records or generates CSV export.
 */
export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const outletId = req.nextUrl.searchParams.get("outletId");
  const dateParam = req.nextUrl.searchParams.get("date");
  const isExport = req.nextUrl.searchParams.get("export") === "true";

  const config = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: ATTENDANCE_PROVIDER } },
  });

  let records: AttendanceItem[] = [];
  if (config?.configJson) {
    try {
      records = JSON.parse(config.configJson);
    } catch {
      records = [];
    }
  }

  if (outletId) {
    records = records.filter((r) => r.outletId === outletId);
  }

  if (dateParam) {
    records = records.filter((r) => r.date === dateParam);
  }

  if (isExport) {
    // Generate CSV
    const headers = "ID,Date,Employee Name,Employee Code,Role,Outlet,Check In,Check Out,Status,Method,Hours Worked\n";
    const rows = records.map((r) => {
      const checkIn = r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : "";
      const checkOut = r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : "";
      return `"${r.id}","${r.date}","${r.employeeName}","${r.employeeCode || ""}","${r.role}","${r.outletName || ""}","${checkIn}","${checkOut}","${r.status}","${r.checkInMethod}","${r.hoursWorked || 0}"`;
    }).join("\n");

    return new Response(headers + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance-${dateParam || "all"}.csv"`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    records,
  });
}

/**
 * POST /api/staff/attendance
 * Check-in punch (self or manager logged).
 */
export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const {
    outletId,
    membershipId,
    employeeName,
    employeeCode,
    role,
    checkInMethod = "SELF_POS",
    shiftName = "Morning",
    scheduledStartTime = "09:00",
    notes,
  } = body;

  if (!outletId || !membershipId) {
    return NextResponse.json({ error: "outletId and membershipId are required" }, { status: 400 });
  }

  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true, name: true },
  });

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // Determine late arrival: if check-in is > 15 minutes past scheduled start time
  let status: AttendanceItem["status"] = "PRESENT";
  if (scheduledStartTime) {
    const [schedH, schedM] = scheduledStartTime.split(":").map(Number);
    const scheduledDateObj = new Date(now);
    scheduledDateObj.setHours(schedH || 9, schedM || 0, 0, 0);

    const diffMinutes = (now.getTime() - scheduledDateObj.getTime()) / (1000 * 60);
    if (diffMinutes > 15) {
      status = "LATE";
    }
  }

  const recordId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newRecord: AttendanceItem = {
    id: recordId,
    tenantId,
    outletId,
    outletName: outlet?.name || "Main Outlet",
    membershipId,
    employeeName: employeeName || "Staff Member",
    employeeCode: employeeCode || undefined,
    role: role || "STAFF",
    date: todayStr,
    checkInTime: now.toISOString(),
    checkOutTime: null,
    status,
    checkInMethod,
    shiftName,
    notes: notes || undefined,
    verifiedBy: userId,
    createdAt: now.toISOString(),
  };

  const existingConfig = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: ATTENDANCE_PROVIDER } },
  });

  let records: AttendanceItem[] = [];
  if (existingConfig?.configJson) {
    try {
      records = JSON.parse(existingConfig.configJson);
    } catch {
      records = [];
    }
  }

  // Check if already checked in today without checkout
  const existingActive = records.find(
    (r) => r.membershipId === membershipId && r.date === todayStr && !r.checkOutTime
  );

  if (existingActive) {
    return NextResponse.json({
      error: "Employee is already clocked in today. Please punch check-out first.",
    }, { status: 400 });
  }

  records.unshift(newRecord);
  if (records.length > 1000) records = records.slice(0, 1000);

  await prisma.integrationConfig.upsert({
    where: { tenantId_provider: { tenantId, provider: ATTENDANCE_PROVIDER } },
    create: {
      tenantId,
      provider: ATTENDANCE_PROVIDER,
      status: "ACTIVE",
      configJson: JSON.stringify(records),
      lastSyncAt: new Date(),
    },
    update: {
      configJson: JSON.stringify(records),
      lastSyncAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "STAFF_ATTENDANCE_CHECKIN",
      entity: "StaffAttendance",
      entityId: recordId,
      metadataJson: JSON.stringify({
        employeeName,
        status,
        checkInMethod,
        outletId,
      }),
    },
  });

  return NextResponse.json({ ok: true, record: newRecord });
}

/**
 * PATCH /api/staff/attendance
 * Check-out punch: calculates total hours worked and sets HALF_DAY status if < 4 hours.
 */
export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const { recordId, notes } = body;

  if (!recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 });
  }

  const existingMembership = await prisma.membership.findFirst({
    where: { userId },
  });
  if (!existingMembership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = existingMembership.tenantId;

  const existingConfig = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: ATTENDANCE_PROVIDER } },
  });

  let records: AttendanceItem[] = [];
  if (existingConfig?.configJson) {
    try {
      records = JSON.parse(existingConfig.configJson);
    } catch {
      records = [];
    }
  }

  const idx = records.findIndex((r) => r.id === recordId);
  if (idx === -1) {
    return NextResponse.json({ error: "Attendance record not found" }, { status: 404 });
  }

  const target = records[idx];
  const now = new Date();
  target.checkOutTime = now.toISOString();

  // Compute hours worked
  const checkInDate = new Date(target.checkInTime);
  const diffHours = Math.max(0, (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60));
  target.hoursWorked = Number(diffHours.toFixed(1));

  if (target.hoursWorked < 4 && target.status !== "LATE") {
    target.status = "HALF_DAY";
  }

  if (notes) {
    target.notes = notes;
  }

  records[idx] = target;

  await prisma.integrationConfig.update({
    where: { tenantId_provider: { tenantId, provider: ATTENDANCE_PROVIDER } },
    data: {
      configJson: JSON.stringify(records),
      lastSyncAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "STAFF_ATTENDANCE_CHECKOUT",
      entity: "StaffAttendance",
      entityId: recordId,
      metadataJson: JSON.stringify({
        employeeName: target.employeeName,
        hoursWorked: target.hoursWorked,
        status: target.status,
      }),
    },
  });

  return NextResponse.json({ ok: true, record: target });
}
