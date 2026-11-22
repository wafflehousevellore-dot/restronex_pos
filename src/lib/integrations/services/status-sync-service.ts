import { prisma } from "@/lib/db";
import { AggregatorProvider } from "../core/integration-types";
import { SwiggyIntegrationProvider } from "../providers/swiggy/adapter";
import { ZomatoIntegrationProvider } from "../providers/zomato/adapter";
import { AggregatorConnectionService } from "./connection-service";

export class AggregatorStatusSyncService {
  /**
   * Sync KDS order status transition to the aggregator with durable queueing & retries
   */
  public static async syncOrderStatus(params: {
    orderId: string;
    targetStatus: "ACCEPTED" | "PREPARING" | "READY_FOR_PICKUP" | "DISPATCHED" | "CANCELLED";
    prepTimeMinutes?: number;
    cancelReason?: string;
  }) {
    const { orderId, targetStatus, prepTimeMinutes, cancelReason } = params;

    // Check if order is an aggregator order
    const ref = await prisma.aggregatorOrderReference.findUnique({
      where: { orderId },
    });

    if (!ref) {
      // Normal POS or QR order, no external aggregator sync needed
      return { synced: false, isAggregatorOrder: false };
    }

    const { tenantId, outletId, provider, providerStoreId, providerOrderId } = ref;

    // 1. Update AggregatorOrderReference in database immediately
    await prisma.aggregatorOrderReference.update({
      where: { id: ref.id },
      data: {
        orderStatus: targetStatus,
        cancelReason: cancelReason || ref.cancelReason,
      },
    });

    // 2. Create durable AggregatorSyncJob record
    const syncJob = await prisma.aggregatorSyncJob.create({
      data: {
        tenantId,
        outletId,
        provider,
        jobType: "STATUS_SYNC",
        status: "IN_PROGRESS",
        payloadJson: JSON.stringify({
          orderId,
          providerOrderId,
          providerStoreId,
          targetStatus,
          prepTimeMinutes: prepTimeMinutes || ref.prepTimeMinutes,
          cancelReason,
        }),
      },
    });

    // 3. Attempt status push to external provider API
    try {
      const conn = await prisma.aggregatorConnection.findUnique({
        where: { tenantId_provider: { tenantId, provider: provider as AggregatorProvider } },
      });
      const creds = AggregatorConnectionService.decryptCredentials(conn?.credentialsEncrypted);

      const adapter = provider === "SWIGGY" ? new SwiggyIntegrationProvider() : new ZomatoIntegrationProvider();
      const result = await adapter.updateOrderStatus(
        creds,
        providerStoreId,
        providerOrderId,
        targetStatus,
        prepTimeMinutes || ref.prepTimeMinutes,
        cancelReason
      );

      if (result.success) {
        // Mark sync job SUCCESS
        await prisma.aggregatorSyncJob.update({
          where: { id: syncJob.id },
          data: {
            status: "SUCCESS",
            responseJson: JSON.stringify(result),
          },
        });

        return {
          synced: true,
          isAggregatorOrder: true,
          provider,
          providerOrderId,
          status: targetStatus,
          jobId: syncJob.id,
        };
      } else {
        throw new Error((result as any).message || (result as any).error || "Provider status update returned unsuccessful response");
      }
    } catch (err: any) {
      console.error(`[AggregatorStatusSync] Status sync failed for order ${orderId}:`, err);

      // Handle retry & backoff
      const retryCount = 1;
      const nextRetryAt = new Date(Date.now() + 30000); // retry in 30s

      await prisma.aggregatorSyncJob.update({
        where: { id: syncJob.id },
        data: {
          status: "PENDING",
          retryCount,
          nextRetryAt,
          errorLog: err.message || String(err),
        },
      });

      return {
        synced: false,
        queuedForRetry: true,
        isAggregatorOrder: true,
        provider,
        providerOrderId,
        status: targetStatus,
        jobId: syncJob.id,
        error: err.message,
      };
    }
  }

  /**
   * Process pending or retryable sync jobs with exponential backoff and dead-letter handling
   */
  public static async processPendingSyncJobs() {
    const pendingJobs = await prisma.aggregatorSyncJob.findMany({
      where: {
        status: "PENDING",
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
      take: 20,
    });

    const results = [];
    for (const job of pendingJobs) {
      try {
        const payload = JSON.parse(job.payloadJson || "{}");
        const { providerStoreId, providerOrderId, targetStatus, prepTimeMinutes, cancelReason } = payload;

        const conn = await prisma.aggregatorConnection.findUnique({
          where: { tenantId_provider: { tenantId: job.tenantId, provider: job.provider as AggregatorProvider } },
        });
        const creds = AggregatorConnectionService.decryptCredentials(conn?.credentialsEncrypted);

        const adapter = job.provider === "SWIGGY" ? new SwiggyIntegrationProvider() : new ZomatoIntegrationProvider();
        const res = await adapter.updateOrderStatus(
          creds,
          providerStoreId,
          providerOrderId,
          targetStatus,
          prepTimeMinutes,
          cancelReason
        );

        if (res.success) {
          await prisma.aggregatorSyncJob.update({
            where: { id: job.id },
            data: {
              status: "SUCCESS",
              responseJson: JSON.stringify(res),
            },
          });
          results.push({ jobId: job.id, status: "SUCCESS" });
        } else {
          throw new Error((res as any).message || (res as any).error || "Provider returned error status");
        }
      } catch (err: any) {
        const newRetryCount = job.retryCount + 1;
        if (newRetryCount >= 3) {
          // Dead-letter queue
          await prisma.aggregatorSyncJob.update({
            where: { id: job.id },
            data: {
              status: "FAILED",
              retryCount: newRetryCount,
              errorLog: err.message,
            },
          });

          await prisma.aggregatorExceptionQueue.create({
            data: {
              tenantId: job.tenantId,
              outletId: job.outletId,
              provider: job.provider,
              errorType: "STATUS_SYNC_FAILED",
              reason: `Status sync failed after 3 attempts: ${err.message}`,
              payloadJson: job.payloadJson || "{}",
            },
          }).catch(() => null);

          results.push({ jobId: job.id, status: "DEAD_LETTERED", error: err.message });
        } else {
          const backoffMs = Math.pow(2, newRetryCount) * 30000;
          await prisma.aggregatorSyncJob.update({
            where: { id: job.id },
            data: {
              retryCount: newRetryCount,
              nextRetryAt: new Date(Date.now() + backoffMs),
              errorLog: err.message,
            },
          });
          results.push({ jobId: job.id, status: "RETRY_SCHEDULED", nextRetryInMs: backoffMs });
        }
      }
    }

    return { processed: results.length, details: results };
  }

  /**
   * Manually retry a specific sync job
   */
  public static async retryJob(jobId: string) {
    const job = await prisma.aggregatorSyncJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw new Error("Sync job not found");

    const payload = JSON.parse(job.payloadJson || "{}");
    const { providerStoreId, providerOrderId, targetStatus, prepTimeMinutes, cancelReason } = payload;

    const conn = await prisma.aggregatorConnection.findUnique({
      where: { tenantId_provider: { tenantId: job.tenantId, provider: job.provider as AggregatorProvider } },
    });
    const creds = AggregatorConnectionService.decryptCredentials(conn?.credentialsEncrypted);

    const adapter = job.provider === "SWIGGY" ? new SwiggyIntegrationProvider() : new ZomatoIntegrationProvider();
    const res = await adapter.updateOrderStatus(
      creds,
      providerStoreId,
      providerOrderId,
      targetStatus,
      prepTimeMinutes,
      cancelReason
    );

    if (res.success) {
      await prisma.aggregatorSyncJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCESS",
          responseJson: JSON.stringify(res),
          errorLog: null,
        },
      });
      return { success: true, status: "SUCCESS" };
    } else {
      await prisma.aggregatorSyncJob.update({
        where: { id: job.id },
        data: {
          retryCount: job.retryCount + 1,
          errorLog: (res as any).message || (res as any).error || "Manual retry failed",
        },
      });
      return { success: false, error: (res as any).message || (res as any).error || "Manual retry failed" };
    }
  }
}
