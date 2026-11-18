import { AggregatorProvider, NormalizedOrderPayload } from "./integration-types";

export type AggregatorEventType =
  | "ORDER_RECEIVED"
  | "ORDER_ACCEPTED"
  | "ORDER_FOOD_READY"
  | "ORDER_DISPATCHED"
  | "ORDER_CANCELLED"
  | "RIDER_STATUS_CHANGED"
  | "MENU_SYNC_COMPLETED"
  | "STORE_STATUS_CHANGED";

export interface AggregatorEventPayload {
  tenantId: string;
  outletId: string;
  provider: AggregatorProvider;
  eventType: AggregatorEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export type AggregatorEventListener = (event: AggregatorEventPayload) => Promise<void> | void;

class AggregatorEventBus {
  private listeners: Map<AggregatorEventType, AggregatorEventListener[]> = new Map();

  public subscribe(eventType: AggregatorEventType, listener: AggregatorEventListener) {
    const list = this.listeners.get(eventType) || [];
    list.push(listener);
    this.listeners.set(eventType, list);
  }

  public async emit(event: AggregatorEventPayload) {
    const list = this.listeners.get(event.eventType) || [];
    for (const listener of list) {
      try {
        await listener(event);
      } catch (err) {
        console.error(`[AggregatorEventBus] Error in listener for ${event.eventType}:`, err);
      }
    }
  }
}

export const aggregatorEventBus = new AggregatorEventBus();
