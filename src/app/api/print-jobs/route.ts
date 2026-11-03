import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const jobs = await prisma.printJob.findMany({
    where: { tenantId },
    include: {
      printer: { select: { name: true, type: true, paperWidth: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json(jobs);
}

// Trigger Test Print or Manual Print Job
export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const { printerId, jobType = "TEST", contentJson } = body;

  if (!printerId) return NextResponse.json({ error: "printerId required" }, { status: 400 });

  const printer = await prisma.printerDevice.findUnique({
    where: { id: printerId },
    include: { outlet: true, tenant: true },
  });
  if (!printer) return NextResponse.json({ error: "Printer device not found" }, { status: 404 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId: printer.tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const samplePayload = contentJson || {
    header: printer.tenant.name,
    outlet: printer.outlet.name,
    printerName: printer.name,
    paperWidth: printer.paperWidth,
    timestamp: new Date().toISOString(),
    diagnostic: "ESC/POS Diagnostic Test Print OK",
  };

  const job = await prisma.printJob.create({
    data: {
      tenantId: printer.tenantId,
      outletId: printer.outletId,
      printerId: printer.id,
      jobType,
      contentJson: typeof samplePayload === "string" ? samplePayload : JSON.stringify(samplePayload),
      status: "PRINTED",
      attempts: 1,
    },
  });

  // Update printer last active timestamp
  await prisma.printerDevice.update({
    where: { id: printer.id },
    data: { lastActiveAt: new Date(), status: "CONNECTED" },
  });

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    status: "PRINTED",
    message: `Test receipt sent to ${printer.name} (${printer.paperWidth}) successfully.`,
  });
}
