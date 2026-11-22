import { prisma } from "@/lib/db";
import { ensureInvoicePublicToken } from "./invoice-token-service";
import {
  buildSmsMessage,
  buildWhatsAppMessage,
  formatINRText,
  normalizePhone,
  resolvePaymentDisplay,
} from "./message-templates";
import { getSmsProvider, SmsProviderConfig } from "./sms-providers";
import { getWhatsAppProvider } from "./whatsapp-providers";

export type DeliveryStatus =
  | "PENDING"
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "NOT_CONFIGURED"
  | "SKIPPED";

export interface CustomerMessageDispatchResult {
  ok: boolean;
  publicToken?: string;
  invoiceUrl?: string;
  whatsapp: {
    status: DeliveryStatus;
    provider: string;
    messageId?: string;
    error?: string;
  };
  sms: {
    status: DeliveryStatus;
    provider: string;
    messageId?: string;
    error?: string;
  };
}

/**
 * Resolves SMS configuration for a tenant from IntegrationConfig or env fallback.
 */
export async function resolveTenantSmsConfig(tenantId: string): Promise<SmsProviderConfig> {
  try {
    const configRow = await prisma.integrationConfig.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: "SMS",
        },
      },
    });

    if (configRow?.configJson) {
      const parsed = JSON.parse(configRow.configJson);
      return {
        provider: parsed.provider || "FAST2SMS",
        apiKey: parsed.apiKey || process.env.FAST2SMS_API_KEY,
        senderId: parsed.senderId || "RSTRNX",
        templateId: parsed.templateId,
        accountSid: parsed.accountSid || process.env.TWILIO_ACCOUNT_SID,
        authToken: parsed.authToken || process.env.TWILIO_AUTH_TOKEN,
        fromNumber: parsed.fromNumber || process.env.TWILIO_FROM_NUMBER,
      };
    }
  } catch (err) {
    console.warn("[CustomerMessaging] Error reading SMS config from DB:", err);
  }

  // Environment fallback or Mock provider
  if (process.env.FAST2SMS_API_KEY) {
    return {
      provider: "FAST2SMS",
      apiKey: process.env.FAST2SMS_API_KEY,
      senderId: process.env.FAST2SMS_SENDER_ID || "RSTRNX",
    };
  }

  return {
    provider: "MOCK",
  };
}

/**
 * Dispatches invoice notifications across both WhatsApp and SMS channels.
 * Completely non-blocking and idempotent.
 */
export async function dispatchCustomerInvoiceMessages(params: {
  orderId: string;
  tenantId: string;
  outletId?: string;
  baseUrl?: string;
  forceRetry?: boolean;
  channels?: Array<"WHATSAPP" | "SMS">;
  useMock?: boolean;
}): Promise<CustomerMessageDispatchResult> {
  const { orderId, tenantId, outletId, baseUrl, forceRetry = false } = params;
  const activeChannels = params.channels || ["WHATSAPP", "SMS"];

  // 1. Fetch order details with payments and invoice
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tenant: { include: { settings: true } },
      outlet: true,
      invoice: true,
      payments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    return {
      ok: false,
      whatsapp: { status: "FAILED", provider: "META", error: "Order not found" },
      sms: { status: "FAILED", provider: "SMS", error: "Order not found" },
    };
  }

  const rawPhone = order.customerPhone || order.invoice?.customerPhone;
  if (!rawPhone || !rawPhone.trim()) {
    return {
      ok: true,
      whatsapp: { status: "SKIPPED", provider: "META", error: "No customer phone provided" },
      sms: { status: "SKIPPED", provider: "SMS", error: "No customer phone provided" },
    };
  }

  const normalizedPhone = normalizePhone(rawPhone);

  // 2. Ensure public secure token
  const { publicToken } = await ensureInvoicePublicToken({
    orderId: order.id,
    tenantId: order.tenantId,
    outletId: order.outletId,
  });

  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "";
  const invoiceUrl = `${base}/invoice/${publicToken}`;
  const invoiceNumber = order.invoice?.invoiceNumber || `INV-${order.orderNumber.replace("ORD-", "")}`;
  const restaurantName =
    order.tenant.settings?.receiptHeader || order.tenant.name || "RestroNex Restaurant";

  // 3. Resolve payment display
  const paymentDisplay = resolvePaymentDisplay({
    totalPaise: order.totalPaise,
    payments: order.payments,
    paymentMethod: order.payments?.[0]?.method || "CASH",
    paymentStatus: order.isPaid ? "PAID" : "UNPAID",
  });

  const messageData = {
    restaurantName,
    invoiceNumber,
    totalPaise: order.totalPaise,
    paidPaise: paymentDisplay.paidPaise,
    balanceDuePaise: paymentDisplay.balanceDuePaise,
    paymentMethod: paymentDisplay.displayMethod,
    paymentStatus: paymentDisplay.displayStatus,
    invoiceUrl,
    customerName: order.customerName,
  };

  const whatsAppText = buildWhatsAppMessage(messageData);
  const smsText = buildSmsMessage(messageData);

  // 4. Concurrently dispatch channels
  const result: CustomerMessageDispatchResult = {
    ok: true,
    publicToken,
    invoiceUrl,
    whatsapp: { status: "SKIPPED", provider: "META" },
    sms: { status: "SKIPPED", provider: "SMS" },
  };

  // WhatsApp Channel
  if (activeChannels.includes("WHATSAPP")) {
    try {
      // Deduplication check
      const existingWa = await prisma.customerMessageLog.findFirst({
        where: {
          orderId: order.id,
          channel: "WHATSAPP",
          status: { in: ["SENT", "DELIVERED"] },
        },
      });

      if (existingWa && !forceRetry) {
        result.whatsapp = {
          status: existingWa.status as DeliveryStatus,
          provider: existingWa.provider,
          messageId: existingWa.providerMessageId || undefined,
        };
      } else {
        const waProvider = getWhatsAppProvider(params.useMock);
        const waRes = await waProvider.send(
          {
            orderId: order.id,
            recipientPhone: normalizedPhone,
            messageText: whatsAppText,
            invoiceUrl,
            invoiceNumber,
            restaurantName,
            totalAmountStr: formatINRText(order.totalPaise),
            baseUrl,
          },
          order.tenantId,
          order.outletId
        );

        result.whatsapp = {
          status: waRes.status as DeliveryStatus,
          provider: waProvider.name,
          messageId: waRes.messageId,
          error: waRes.error,
        };

        // Persist message log
        await prisma.customerMessageLog.create({
          data: {
            tenantId: order.tenantId,
            outletId: order.outletId,
            orderId: order.id,
            invoiceId: order.invoice?.id,
            recipientPhone: normalizedPhone,
            channel: "WHATSAPP",
            provider: waProvider.name,
            status: waRes.status,
            providerMessageId: waRes.messageId,
            errorMessage: waRes.error,
            messageBody: whatsAppText,
            sentAt: waRes.ok ? new Date() : undefined,
          },
        });
      }
    } catch (waErr: any) {
      console.warn("[CustomerMessaging] WhatsApp non-fatal error:", waErr);
      result.whatsapp = { status: "FAILED", provider: "META", error: waErr.message };
    }
  }

  // SMS Channel
  if (activeChannels.includes("SMS")) {
    try {
      // Deduplication check
      const existingSms = await prisma.customerMessageLog.findFirst({
        where: {
          orderId: order.id,
          channel: "SMS",
          status: { in: ["SENT", "DELIVERED"] },
        },
      });

      if (existingSms && !forceRetry) {
        result.sms = {
          status: existingSms.status as DeliveryStatus,
          provider: existingSms.provider,
          messageId: existingSms.providerMessageId || undefined,
        };
      } else {
        const smsConfig = await resolveTenantSmsConfig(order.tenantId);
        const effectiveProviderType = params.useMock ? "MOCK" : smsConfig.provider;
        const smsProvider = getSmsProvider(effectiveProviderType);

        const smsRes = await smsProvider.send(
          {
            recipientPhone: normalizedPhone,
            messageText: smsText,
            senderId: smsConfig.senderId,
            dltTemplateId: smsConfig.templateId,
          },
          smsConfig
        );

        result.sms = {
          status: smsRes.status as DeliveryStatus,
          provider: smsProvider.name,
          messageId: smsRes.messageId,
          error: smsRes.error,
        };

        // Persist message log
        await prisma.customerMessageLog.create({
          data: {
            tenantId: order.tenantId,
            outletId: order.outletId,
            orderId: order.id,
            invoiceId: order.invoice?.id,
            recipientPhone: normalizedPhone,
            channel: "SMS",
            provider: smsProvider.name,
            status: smsRes.status,
            providerMessageId: smsRes.messageId,
            errorMessage: smsRes.error,
            messageBody: smsText,
            sentAt: smsRes.ok ? new Date() : undefined,
          },
        });
      }
    } catch (smsErr: any) {
      console.warn("[CustomerMessaging] SMS non-fatal error:", smsErr);
      result.sms = { status: "FAILED", provider: "SMS", error: smsErr.message };
    }
  }

  return result;
}

/**
 * Retries sending a customer message for an existing failed log or order.
 */
export async function retryCustomerInvoiceMessage(params: {
  tenantId: string;
  orderId: string;
  channel: "WHATSAPP" | "SMS";
  baseUrl?: string;
}): Promise<CustomerMessageDispatchResult> {
  return dispatchCustomerInvoiceMessages({
    orderId: params.orderId,
    tenantId: params.tenantId,
    baseUrl: params.baseUrl,
    forceRetry: true,
    channels: [params.channel],
  });
}
