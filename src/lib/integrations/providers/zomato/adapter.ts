import crypto from "crypto";
import { IIntegrationProvider } from "../../core/integration-provider";
import {
  AggregatorCredentials,
  AggregatorProvider,
  MasterMenuSyncResult,
  MenuItemSyncPayload,
  NormalizedOrderPayload,
} from "../../core/integration-types";
import { ZomatoApiClient } from "./client";
import { mapZomatoToNormalizedOrder } from "./mapper";
import { ZomatoOrderPayloadSchema } from "./schemas";

export class ZomatoIntegrationProvider implements IIntegrationProvider {
  public readonly provider: AggregatorProvider = "ZOMATO";

  public verifyWebhookSignature(
    headers: Headers | Record<string, string | string[] | undefined>,
    rawBody: string,
    secret?: string
  ): boolean {
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        console.warn("[Zomato Webhook]: Missing ZOMATO_WEBHOOK_SECRET in production - rejecting unsigned delivery");
        return false;
      }
      return true; // Development / test mode bypass only
    }

    const getHeader = (key: string): string | undefined => {
      if (typeof headers.get === "function") return headers.get(key) || undefined;
      const val = (headers as Record<string, string | string[] | undefined>)[key];
      return Array.isArray(val) ? val[0] : val;
    };

    const signature = getHeader("x-zomato-signature") || getHeader("authorization");
    if (!signature) return false;

    // Bearer token match or HMAC-SHA256
    if (signature.startsWith("Bearer ") && signature.replace("Bearer ", "").trim() === secret) {
      return true;
    }

    const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const sigBuf = Buffer.from(signature);
    const compBuf = Buffer.from(computed);
    if (sigBuf.length !== compBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, compBuf);
  }

  public formatWebhookAck(
    eventType: string,
    orderId?: string,
    status: "SUCCESS" | "FAILURE" = "SUCCESS",
    error?: string
  ): { status: number; body: Record<string, any> } {
    if (status === "SUCCESS") {
      return {
        status: 200,
        body: {
          status: "success",
          message: "Order processed successfully",
          order_id: orderId,
          timestamp: new Date().toISOString(),
        },
      };
    }
    return {
      status: 400,
      body: {
        status: "failure",
        message: error || "Webhook processing failed",
        order_id: orderId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  public parseOrderPayload(rawBody: string): NormalizedOrderPayload {
    const json = JSON.parse(rawBody);
    const validated = ZomatoOrderPayloadSchema.parse(json);
    return mapZomatoToNormalizedOrder(validated, rawBody);
  }

  public parseStatusUpdatePayload(rawBody: string) {
    const json = JSON.parse(rawBody);
    return {
      providerOrderId: String(json.order_id || json.orderId),
      orderStatus: String(json.status || "UPDATED"),
      riderName: json.delivery_boy?.name || json.rider?.name,
      riderPhone: json.delivery_boy?.phone_number || json.rider?.phone,
      riderStatus: json.delivery_boy?.status || json.rider?.status,
      cancelReason: json.rejection_reason || json.cancel_reason,
    };
  }

  public async pushMenu(
    credentials: AggregatorCredentials,
    storeId: string,
    items: MenuItemSyncPayload[]
  ): Promise<MasterMenuSyncResult> {
    const client = new ZomatoApiClient(credentials);
    return client.pushMenu(storeId, items);
  }

  public async updateStoreStatus(
    credentials: AggregatorCredentials,
    storeId: string,
    isOnline: boolean,
    reason?: string
  ) {
    const client = new ZomatoApiClient(credentials);
    return client.updateStoreStatus(storeId, isOnline, reason);
  }

  public async updateItemAvailability(
    credentials: AggregatorCredentials,
    storeId: string,
    providerItemIds: string[],
    isAvailable: boolean
  ) {
    const client = new ZomatoApiClient(credentials);
    return client.updateItemAvailability(storeId, providerItemIds, isAvailable);
  }

  public async updateOrderStatus(
    credentials: AggregatorCredentials,
    storeId: string,
    providerOrderId: string,
    status: "ACCEPTED" | "PREPARING" | "READY_FOR_PICKUP" | "DISPATCHED" | "CANCELLED",
    prepTimeMinutes?: number,
    cancelReason?: string
  ) {
    const client = new ZomatoApiClient(credentials);
    return client.updateOrderStatus(storeId, providerOrderId, status, prepTimeMinutes, cancelReason);
  }
}
