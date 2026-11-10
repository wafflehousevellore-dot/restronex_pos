import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { dispatchPrintJob } from "@/lib/thermal-printer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const { jobId, orderId } = body;

  if (!jobId && !orderId) {
    return NextResponse.json({ error: "jobId or orderId required" }, { status: 400 });
  }

  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const job = jobId
    ? await prisma.printJob.findFirst({ where: { id: jobId, tenantId }, include: { printer: true } })
    : await prisma.printJob.findFirst({
        where: { orderId, tenantId, jobType: "BILL" },
        include: { printer: true },
        orderBy: { createdAt: "desc" },
      });

  if (!job) return NextResponse.json({ error: "Print job not found" }, { status: 404 });

  if (job.status === "PRINTED") {
    return NextResponse.json({ ok: true, jobId: job.id, status: "PRINTED", replayed: true });
  }

  await prisma.printJob.update({
    where: { id: job.id },
    data: { status: "QUEUED", lastError: null, nextRetryAt: null },
  });

  const dispatchRes = await dispatchPrintJob(job.id);
  const parsed = job.contentJson ? JSON.parse(job.contentJson) : {};

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    status: dispatchRes.status,
    requiresClientDispatch: dispatchRes.requiresClientDispatch,
    printerType: job.printer?.type || null,
    escPosBase64: parsed.escPosBase64,
    textLines: parsed.textLines,
    error: dispatchRes.error,
  });
}
