import { prisma } from "@/lib/db";
import { AggregatorProvider } from "../core/integration-types";
import { SwiggyIntegrationProvider } from "../providers/swiggy/adapter";
import { ZomatoIntegrationProvider } from "../providers/zomato/adapter";
import { AggregatorConnectionService } from "./connection-service";

export class AggregatorStatusSyncService {
  /**
   * Sync KDS order status transition to the aggregator
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

    const { tenantId, provider, providerStoreId, providerOrderId } = ref;

    // Update AggregatorOrderReference in database
    await prisma.aggregatorOrderReference.update({
      where: { id: ref.id },
      data: {
        orderStatus: targetStatus,
        cancelReason: cancelReason || ref.cancelReason,
      },
    });

    // Notify aggregator API
    const conn = await prisma.aggregatorConnection.findUnique({
      where: { tenantId_provider: { tenantId, provider: provider as AggregatorProvider } },
    });
    const creds = AggregatorConnectionService.decryptCredentials(conn?.credentialsEncrypted);

    const adapter = provider === "SWIGGY" ? new SwiggyIntegrationProvider() : new ZomatoIntegrationProvider();
    await adapter.updateOrderStatus(
      creds,
      providerStoreId,
      providerOrderId,
      targetStatus,
      prepTimeMinutes || ref.prepTimeMinutes,
      cancelReason
    );

    return {
      synced: true,
      isAggregatorOrder: true,
      provider,
      providerOrderId,
      status: targetStatus,
    };
  }
}
