import { EventEmitter } from "events";

export type KdsEventType =
  | "NEW_ORDER"
  | "ORDER_CANCELLED"
  | "TICKET_ACKNOWLEDGED"
  | "TICKET_STATUS_UPDATED"
  | "KOT_PRINTED";

export interface KdsEventPayload {
  type: KdsEventType;
  tenantId: string;
  outletId: string;
  ticketId?: string;
  orderId?: string;
  orderNumber?: string;
  source?: string;
  status?: string;
  cancelReason?: string;
  customerName?: string;
  itemsSummary?: string;
  timestamp: string;
  payload?: any;
}

declare global {
  var __kdsEventEmitter: EventEmitter | undefined;
}

function getEventEmitter(): EventEmitter {
  if (!globalThis.__kdsEventEmitter) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(200);
    globalThis.__kdsEventEmitter = emitter;
  }
  return globalThis.__kdsEventEmitter;
}

export const kdsEmitter = getEventEmitter();

/**
 * Broadcasts an event to all active KDS display screens for a given tenant/outlet.
 */
export function broadcastKdsEvent(event: Omit<KdsEventPayload, "timestamp">) {
  const fullEvent: KdsEventPayload = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  const channel = `kds:${event.tenantId}:${event.outletId}`;
  kdsEmitter.emit(channel, fullEvent);
  kdsEmitter.emit(`kds:${event.tenantId}:*`, fullEvent);
  kdsEmitter.emit("kds:all", fullEvent);

  return fullEvent;
}

/**
 * Subscribes a listener to KDS events for a specific tenant and outlet.
 */
export function subscribeKdsEvents(
  tenantId: string,
  outletId: string | null,
  callback: (event: KdsEventPayload) => void
): () => void {
  const channel = outletId ? `kds:${tenantId}:${outletId}` : `kds:${tenantId}:*`;
  kdsEmitter.on(channel, callback);
  return () => {
    kdsEmitter.off(channel, callback);
  };
}
