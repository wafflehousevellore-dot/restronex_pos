import { prisma } from "./db";
import { dispatchWhatsAppQueueItem, type WhatsAppTransport } from "./whatsapp-invoice";
import { dispatchPrintJob, type PrintTransportOverride } from "./thermal-printer";

export async function processDueBackgroundJobs(opts?: {
  tenantId?: string;
  limit?: number;
  whatsappTransport?: WhatsAppTransport;
  printTransport?: PrintTransportOverride;
}) {
  const now = new Date();
  const limit = Math.min(Math.max(1, opts?.limit || 25), 100);
  const tenantFilter = opts?.tenantId ? { tenantId: opts.tenantId } : {};

  // 1. Process due WhatsApp retries & pending queued items
  const dueWhatsApp = await prisma.whatsAppMessageQueue.findMany({
    where: {
      ...tenantFilter,
      OR: [
        { status: "QUEUED" },
        {
          status: "FAILED",
          nextRetryAt: { lte: now },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const waResults: { id: string; status: string; error?: string }[] = [];
  for (const job of dueWhatsApp) {
    if (job.retryCount >= job.maxRetries) continue;
    const res = await dispatchWhatsAppQueueItem(job.id, opts?.whatsappTransport);
    waResults.push({ id: job.id, status: res.status, error: res.error });
  }

  // 2. Process due thermal print job retries (skip already PRINTED or NOT_CONFIGURED)
  const duePrints = await prisma.printJob.findMany({
    where: {
      ...tenantFilter,
      status: { in: ["OFFLINE", "FAILED"] },
      nextRetryAt: { lte: now },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const printResults: { id: string; status: string; error?: string }[] = [];
  for (const pj of duePrints) {
    if (pj.attempts >= pj.maxRetries) continue;
    const res = await dispatchPrintJob(pj.id, opts?.printTransport);
    printResults.push({ id: pj.id, status: res.status, error: res.error });
  }

  return {
    processedAt: now.toISOString(),
    whatsappProcessed: waResults.length,
    whatsappResults: waResults,
    printProcessed: printResults.length,
    printResults,
  };
}
