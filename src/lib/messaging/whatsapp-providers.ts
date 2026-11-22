import { queueAndSendWhatsAppInvoice, resolveWhatsAppConfig } from "@/lib/whatsapp-invoice";

export interface WhatsAppSendPayload {
  orderId: string;
  recipientPhone: string;
  messageText: string;
  invoiceUrl: string;
  invoiceNumber: string;
  restaurantName: string;
  totalAmountStr: string;
  baseUrl?: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  status: "SENT" | "DELIVERED" | "QUEUED" | "FAILED" | "NOT_CONFIGURED" | "SKIPPED";
  messageId?: string;
  provider: "META" | "MOCK";
  error?: string;
}

export interface WhatsAppProvider {
  name: "META" | "MOCK";
  send(payload: WhatsAppSendPayload, tenantId: string, outletId?: string): Promise<WhatsAppSendResult>;
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  name = "MOCK" as const;
  private static sentMessages: Array<{
    payload: WhatsAppSendPayload;
    sentAt: Date;
    messageId: string;
  }> = [];

  async send(payload: WhatsAppSendPayload): Promise<WhatsAppSendResult> {
    const messageId = `wamid.mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    MockWhatsAppProvider.sentMessages.push({
      payload,
      sentAt: new Date(),
      messageId,
    });
    return {
      ok: true,
      status: "SENT",
      messageId,
      provider: "MOCK",
    };
  }

  static getSentMessages() {
    return this.sentMessages;
  }

  static clearSentMessages() {
    this.sentMessages = [];
  }
}

export class MetaWhatsAppProvider implements WhatsAppProvider {
  name = "META" as const;

  async send(
    payload: WhatsAppSendPayload,
    tenantId: string,
    outletId?: string
  ): Promise<WhatsAppSendResult> {
    try {
      const cfg = await resolveWhatsAppConfig(tenantId, outletId);
      if (!cfg.enabled || !cfg.phoneNumberId || !cfg.accessToken) {
        return {
          ok: false,
          status: "NOT_CONFIGURED",
          provider: "META",
          error: "Meta WhatsApp credentials not configured or disabled",
        };
      }

      const res = await queueAndSendWhatsAppInvoice(payload.orderId, {
        baseUrl: payload.baseUrl,
      });

      if (res.queued) {
        return {
          ok: true,
          status: (res.status as any) || "QUEUED",
          messageId: res.queueId || undefined,
          provider: "META",
        };
      }

      return {
        ok: false,
        status: "FAILED",
        provider: "META",
        error: res.reason || "Meta API dispatch failed",
      };
    } catch (err: any) {
      return {
        ok: false,
        status: "FAILED",
        provider: "META",
        error: err.message || "Meta API exception",
      };
    }
  }
}

export function getWhatsAppProvider(useMock = false): WhatsAppProvider {
  if (useMock || process.env.NODE_ENV === "test") {
    return new MockWhatsAppProvider();
  }
  return new MetaWhatsAppProvider();
}
