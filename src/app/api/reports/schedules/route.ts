import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export interface ScheduledReportItem {
  id: string;
  reportType: "DAILY_SALES" | "WEEKLY_BUSINESS" | "MONTHLY_FINANCIAL" | "LOW_STOCK" | "DAY_END";
  title: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  deliveryTime: string; // e.g. "23:30"
  recipientEmail: string;
  outletScope: string; // "ALL" or outletId
  channel: "EMAIL" | "IN_APP";
  enabled: boolean;
  lastRunAt?: string | null;
  createdAt: string;
}

const DEFAULT_SCHEDULES: ScheduledReportItem[] = [
  {
    id: "sched-daily-sales",
    reportType: "DAILY_SALES",
    title: "Daily Sales & Revenue Z-Report",
    frequency: "DAILY",
    deliveryTime: "23:30",
    recipientEmail: "owner@restaurant.com",
    outletScope: "ALL",
    channel: "IN_APP",
    enabled: true,
    lastRunAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "sched-low-stock",
    reportType: "LOW_STOCK",
    title: "Morning Low Stock & Spoilage Alert",
    frequency: "DAILY",
    deliveryTime: "08:00",
    recipientEmail: "kitchen@restaurant.com",
    outletScope: "ALL",
    channel: "IN_APP",
    enabled: true,
    lastRunAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "sched-weekly-financial",
    reportType: "WEEKLY_BUSINESS",
    title: "Weekly Financial Summary & COGS Margins",
    frequency: "WEEKLY",
    deliveryTime: "09:00",
    recipientEmail: "accountant@restaurant.com",
    outletScope: "ALL",
    channel: "IN_APP",
    enabled: true,
    lastRunAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

async function getSchedules(tenantId: string): Promise<ScheduledReportItem[]> {
  try {
    const config = await prisma.integrationConfig.findUnique({
      where: { tenantId_provider: { tenantId, provider: "reports_scheduler" } },
    });
    if (!config?.configJson) return DEFAULT_SCHEDULES;
    const parsed = JSON.parse(config.configJson);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SCHEDULES;
  } catch {
    return DEFAULT_SCHEDULES;
  }
}

async function saveSchedules(tenantId: string, items: ScheduledReportItem[]): Promise<void> {
  await prisma.integrationConfig.upsert({
    where: { tenantId_provider: { tenantId, provider: "reports_scheduler" } },
    create: {
      tenantId,
      provider: "reports_scheduler",
      status: "CONNECTED",
      configJson: JSON.stringify(items),
      lastSyncAt: new Date(),
    },
    update: {
      status: "CONNECTED",
      configJson: JSON.stringify(items),
      lastSyncAt: new Date(),
    },
  });
}

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Missing organization" }, { status: 400 });

  const schedules = await getSchedules(tenantId);
  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ error: "Missing organization" }, { status: 400 });

  const body = await req.json();
  const { action, schedule, scheduleId } = body;

  const current = await getSchedules(tenantId);

  if (action === "TOGGLE") {
    const updated = current.map((s) => (s.id === scheduleId ? { ...s, enabled: !s.enabled } : s));
    await saveSchedules(tenantId, updated);
    return NextResponse.json({ success: true, schedules: updated });
  }

  if (action === "SAVE") {
    const newRecord: ScheduledReportItem = {
      id: schedule.id || `sched-${Date.now()}`,
      reportType: schedule.reportType || "DAILY_SALES",
      title: schedule.title || "Automated Report",
      frequency: schedule.frequency || "DAILY",
      deliveryTime: schedule.deliveryTime || "23:00",
      recipientEmail: schedule.recipientEmail || "management@restaurant.com",
      outletScope: schedule.outletScope || "ALL",
      channel: "IN_APP",
      enabled: schedule.enabled ?? true,
      createdAt: new Date().toISOString(),
    };

    const existingIndex = current.findIndex((s) => s.id === newRecord.id);
    const updated = [...current];
    if (existingIndex >= 0) {
      updated[existingIndex] = newRecord;
    } else {
      updated.unshift(newRecord);
    }

    await saveSchedules(tenantId, updated);
    return NextResponse.json({ success: true, schedule: newRecord, schedules: updated });
  }

  if (action === "DELETE") {
    const updated = current.filter((s) => s.id !== scheduleId);
    await saveSchedules(tenantId, updated);
    return NextResponse.json({ success: true, schedules: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
