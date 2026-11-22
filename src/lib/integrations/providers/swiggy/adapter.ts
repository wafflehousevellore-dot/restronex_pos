import crypto from "crypto";
import { IIntegrationProvider } from "../../core/integration-provider";
import {
  AggregatorCredentials,
  AggregatorProvider,
  MasterMenuSyncResult,
  MenuItemSyncPayload,
  NormalizedOrderPayload,
} from "../../core/integration-types";
import { SwiggyApiClient } from "./client";
import { mapSwiggyToNormalizedOrder } from "./mapper";
import { SwiggyOrderPayloadSchema } from "./schemas";

export class SwiggyIntegrationProvider implements IIntegrationProvider {
  public readonly provider: AggregatorProvider = "SWIGGY";

  public verifyWebhookSignature(
    headers: Headers | Record<string, string | string[] | undefined>,
    rawBody: string,
    secret?: string
  ): boolean {
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        console.warn("[Swiggy Webhook]: Missing SWIGGY_WEBHOOK_SECRET in production - rejecting unsigned delivery");
        return false;
      }
      return true; // Development / test mode bypass only
    }

    const getHeader = (key: string): string | undefined => {
      if (typeof headers.get === "function") return headers.get(key) || undefined;
      const val = (headers as Record<string, string | string[] | undefined>)[key];
      return Array.isArray(val) ? val[0] : val;
    };

    const signature = getHeader("x-swiggy-signature") || getHeader("x-hub-signature-256");
    if (!signature) return false;

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
          status: "SUCCESS",
          message: "Order processed successfully",
          order_id: orderId,
          timestamp: new Date().toISOString(),
        },
      };
    }
    return {
      status: 400,
      body: {
        status: "FAILURE",
        error: error || "Webhook processing failed",
        order_id: orderId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  public parseOrderPayload(rawBody: string): NormalizedOrderPayload {
    const json = JSON.parse(rawBody);
    const validated = SwiggyOrderPayloadSchema.parse(json);
    return mapSwiggyToNormalizedOrder(validated, rawBody);
  }

  public parseStatusUpdatePayload(rawBody: string) {
    const json = JSON.parse(rawBody);
    return {
      providerOrderId: String(json.order_id || json.orderId),
      orderStatus: String(json.status || "UPDATED"),
      riderName: json.rider?.name,
      riderPhone: json.rider?.phone_number || json.rider?.phone,
      riderStatus: json.rider?.status,
      cancelReason: json.cancel_reason || json.reason,
    };
  }

  public async pushMenu(
    credentials: AggregatorCredentials,
    storeId: string,
    items: MenuItemSyncPayload[]
  ): Promise<MasterMenuSyncResult> {
    const client = new SwiggyApiClient(credentials);
    return client.pushMenu(storeId, items);
  }

  public async updateStoreStatus(
    credentials: AggregatorCredentials,
    storeId: string,
    isOnline: boolean,
    reason?: string
  ) {
    const client = new SwiggyApiClient(credentials);
    return client.updateStoreStatus(storeId, isOnline, reason);
  }

  public async updateItemAvailability(
    credentials: AggregatorCredentials,
    storeId: string,
    providerItemIds: string[],
    isAvailable: boolean
  ) {
    const client = new SwiggyApiClient(credentials);
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
    const client = new SwiggyApiClient(credentials);
    return client.updateOrderStatus(storeId, providerOrderId, status, prepTimeMinutes, cancelReason);
  }
}
