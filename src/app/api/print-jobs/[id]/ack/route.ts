import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_ACK_STATUSES = new Set([
  "PRINTING",
  "PRINT_REQUESTED",
  "PRINTED",
  "OFFLINE",
  "FAILED",
]);

/**
 * Receives genuine hardware / browser print execution feedback for a specific PrintJob.
 * Guarantees PRINTED is recorded only when hardware or local bridge explicitly confirms.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const status = String(body?.status || "").toUpperCase();
  const lastError = body?.lastError ? String(body.lastError) : null;

  if (!ALLOWED_ACK_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid print ack status" }, { status: 400 });
  }

  const job = await prisma.printJob.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Print job not found" }, { status: 404 });

  const tenantId = await resolveTenantId(userId, job.tenantId);
  if (!tenantId || tenantId !== job.tenantId) {
    return NextResponse.json({ error: "Tenant verification mismatch" }, { status: 403 });
  }

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId: job.tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const updated = await prisma.printJob.update({
    where: { id: job.id },
    data: {
      status,
      lastError,
      printedAt: status === "PRINTED" ? now : undefined,
      nextRetryAt:
        (status === "OFFLINE" || status === "FAILED") && job.attempts < job.maxRetries
          ? new Date(Date.now() + 60_000 * Math.pow(2, Math.max(0, job.attempts - 1)))
          : null,
    },
  });

  if (job.printerId && (status === "PRINTED" || status === "OFFLINE" || status === "FAILED")) {
    await prisma.printerDevice
      .update({
        where: { id: job.printerId },
        data: {
          status: status === "PRINTED" ? "CONNECTED" : status === "OFFLINE" ? "OFFLINE" : "ERROR",
          lastActiveAt: status === "PRINTED" ? now : undefined,
        },
      })
      .catch(() => {});
  }

  if (job.orderId) {
    await prisma.order
      .update({
        where: { id: job.orderId },
        data: { printStatus: status },
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true, jobId: updated.id, status: updated.status });
}

