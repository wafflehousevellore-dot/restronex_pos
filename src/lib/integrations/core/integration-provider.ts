import {
  AggregatorCredentials,
  AggregatorProvider,
  MasterMenuSyncResult,
  MenuItemSyncPayload,
  NormalizedOrderPayload,
} from "./integration-types";

export interface IIntegrationProvider {
  readonly provider: AggregatorProvider;

  verifyWebhookSignature(
    headers: Headers | Record<string, string | string[] | undefined>,
    rawBody: string,
    secret?: string
  ): boolean;

  formatWebhookAck(
    eventType: string,
    orderId?: string,
    status?: "SUCCESS" | "FAILURE",
    error?: string
  ): { status: number; body: Record<string, any> };

  parseOrderPayload(rawBody: string): NormalizedOrderPayload;

  parseStatusUpdatePayload(rawBody: string): {
    providerOrderId: string;
    orderStatus: string;
    riderName?: string;
    riderPhone?: string;
    riderStatus?: string;
    cancelReason?: string;
  };

  pushMenu(
    credentials: AggregatorCredentials,
    storeId: string,
    items: MenuItemSyncPayload[]
  ): Promise<MasterMenuSyncResult>;

  updateStoreStatus(
    credentials: AggregatorCredentials,
    storeId: string,
    isOnline: boolean,
    reason?: string
  ): Promise<{ success: boolean; message?: string }>;

  updateItemAvailability(
    credentials: AggregatorCredentials,
    storeId: string,
    providerItemIds: string[],
    isAvailable: boolean
  ): Promise<{ success: boolean; updatedCount: number }>;

  updateOrderStatus(
    credentials: AggregatorCredentials,
    storeId: string,
    providerOrderId: string,
    status: "ACCEPTED" | "PREPARING" | "READY_FOR_PICKUP" | "DISPATCHED" | "CANCELLED",
    prepTimeMinutes?: number,
    cancelReason?: string
  ): Promise<{ success: boolean; message?: string }>;
}
