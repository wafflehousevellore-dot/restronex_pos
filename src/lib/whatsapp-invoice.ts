import { prisma } from "./db";
import { formatINR } from "./money";
import { decryptSecret, encryptSecret } from "./encryption";
import {
  buildSignedInvoicePdfUrl,
  generateAndPersistInvoicePdf,
} from "./invoice-storage";

export interface FormattedWhatsAppBillParams {
  restaurantName: string;
  customerName: string;
  invoiceNumber: string;
  orderType: string;
  tableNumber?: string | null;
  invoiceDate: string;
  invoiceTime: string;
  items: { name: string; quantity: number; unitPricePaise: number; totalPaise: number }[];
  subtotalPaise: number;
  discountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  otherTaxesPaise?: number;
  totalPaise: number;
  paymentMethod: string;
  paymentStatus: "PAID" | "UNPAID" | "REFUNDED";
  transactionId?: string | null;
  outletName: string;
  pdfUrl?: string | null;
}

export type ResolvedWhatsAppConfig = {
  source: "OUTLET" | "TENANT" | "NONE";
  enabled: boolean;
  phoneNumberId: string | null;
  wabaId: string | null;
  displayPhone: string | null;
  accessToken: string | null;
  templateName: string;
  connectionMode: string;
  status: string;
};

export type WhatsAppTransportResult = {
  ok: boolean;
  wamid?: string | null;
  error?: string | null;
};

export type WhatsAppTransport = (req: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  pdfUrl: string | null;
  invoiceNumber: string;
  messageText: string;
  bodyParams: string[];
}) => Promise<WhatsAppTransportResult>;

export function encryptAccessToken(plainToken: string): string {
  const clean = plainToken.trim();
  if (!clean) return "";
  return encryptSecret(clean);
}

export function decryptAccessToken(storedToken: string | null | undefined): string | null {
  if (!storedToken) return null;
  const parts = storedToken.split(":");
  if (parts.length === 3) {
    return decryptSecret(storedToken);
  }
  return storedToken;
}

/**
 * Resolves WhatsApp Business API config strictly within a tenant/outlet.
 * Checks outlet-specific override first, then tenant-level RestaurantSetting.
 */
export async function resolveWhatsAppConfig(
  tenantId: string,
  outletId?: string | null
): Promise<ResolvedWhatsAppConfig> {
  const [outletCfg, setting] = await Promise.all([
    outletId
      ? prisma.outletWhatsAppConfig.findFirst({
          where: { tenantId, outletId },
        })
      : Promise.resolve(null),
    prisma.restaurantSetting.findUnique({ where: { tenantId } }),
  ]);

  if (outletCfg && outletCfg.phoneNumberId && outletCfg.accessTokenEnc) {
    return {
      source: "OUTLET",
      enabled: outletCfg.enabled,
      phoneNumberId: outletCfg.phoneNumberId,
      wabaId: outletCfg.wabaId,
      displayPhone: outletCfg.displayPhone,
      accessToken: decryptAccessToken(outletCfg.accessTokenEnc),
      templateName: outletCfg.templateName || setting?.whatsappTemplateName || "order_invoice_utility",
      connectionMode: outletCfg.connectionMode || "META_CLOUD_API",
      status: outletCfg.status || "CONNECTED",
    };
  }

  if (setting) {
    const token = decryptAccessToken(setting.whatsappAccessToken);
    const hasCreds = Boolean(setting.whatsappPhoneNumberId && token);
    return {
      source: hasCreds ? "TENANT" : "NONE",
      enabled: setting.autoSendWhatsAppInvoice,
      phoneNumberId: setting.whatsappPhoneNumberId || null,
      wabaId: setting.whatsappWabaId || null,
      displayPhone: setting.whatsappDisplayPhone || null,
      accessToken: token,
      templateName: setting.whatsappTemplateName || "order_invoice_utility",
      connectionMode: setting.whatsappConnectionMode || "META_CLOUD_API",
      status: hasCreds ? setting.whatsappConnectionStatus || "CONNECTED" : "NOT_CONFIGURED",
    };
  }

  return {
    source: "NONE",
    enabled: false,
    phoneNumberId: null,
    wabaId: null,
    displayPhone: null,
    accessToken: null,
    templateName: "order_invoice_utility",
    connectionMode: "META_CLOUD_API",
    status: "NOT_CONFIGURED",
  };
}

/**
 * Builds the exact compliant transactional invoice WhatsApp message format.
 */
export function formatWhatsAppBillMessage(params: FormattedWhatsAppBillParams): string {
  const dynamicItems = params.items
    .map((item) => `• ${item.quantity}x ${item.name} — ${formatINR(item.totalPaise)}`)
    .join("\n");

  const tableStr = params.tableNumber ? params.tableNumber : "Counter / Takeaway";
  const orderTypeStr = (params.orderType || "DINE_IN").replace("_", " ");
  const discountStr = params.discountPaise > 0 ? `- ${formatINR(params.discountPaise)}` : "₹0.00";
  const otherTaxesStr =
    params.otherTaxesPaise && params.otherTaxesPaise > 0 ? formatINR(params.otherTaxesPaise) : "₹0.00";
  const txnIdStr = params.transactionId || params.invoiceNumber;
  const pdfLine = params.pdfUrl ? `\n📄 Invoice PDF: ${params.pdfUrl}\n` : "";

  return (
    `🍽️ *${params.restaurantName}*\n\n` +
    `Hi ${params.customerName}! 👋\n` +
    `Thank you for dining with us.\n\n` +
    `🧾 *TAX INVOICE*\n\n` +
    `Bill No: ${params.invoiceNumber}\n` +
    `Order Type: ${orderTypeStr}\n` +
    `Table: ${tableStr}\n` +
    `Date: ${params.invoiceDate}\n` +
    `Time: ${params.invoiceTime}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `*ORDER DETAILS*\n\n` +
    `${dynamicItems}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `*BILL SUMMARY*\n\n` +
    `Subtotal: ${formatINR(params.subtotalPaise)}\n` +
    `Discount: ${discountStr}\n` +
    `CGST: ${formatINR(params.cgstPaise)}\n` +
    `SGST: ${formatINR(params.sgstPaise)}\n` +
    `Other Taxes: ${otherTaxesStr}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `*TOTAL AMOUNT: ${formatINR(params.totalPaise)}*\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `Payment Method: ${params.paymentMethod}\n` +
    `Payment Status: ${params.paymentStatus}\n\n` +
    `Transaction ID: ${txnIdStr}\n\n` +
    `Outlet: ${params.outletName}\n` +
    `${pdfLine}\n` +
    `Thank you for choosing us! ❤️\n\n` +
    `Powered by RestroNex – Restaurant OS.`
  );
}

/**
 * Normalizes phone numbers to international standard format (E.164 digits without '+' for Meta API).
 */
export function normalizeWhatsAppPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  return digits;
}

export async function defaultMetaWhatsAppTransport(req: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  pdfUrl: string | null;
  invoiceNumber: string;
  messageText: string;
  bodyParams: string[];
}): Promise<WhatsAppTransportResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const templateComponents: any[] = [];
    if (req.pdfUrl) {
      templateComponents.push({
        type: "header",
        parameters: [
          {
            type: "document",
            document: {
              link: req.pdfUrl,
              filename: `${req.invoiceNumber}.pdf`,
            },
          },
        ],
      });
    }
    templateComponents.push({
      type: "body",
      parameters: req.bodyParams.map((txt) => ({ type: "text", text: txt })),
    });

    const endpoint = `https://graph.facebook.com/v21.0/${req.phoneNumberId}/messages`;
    const metaRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${req.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: req.to,
        type: "template",
        template: {
          name: req.templateName || "order_invoice_utility",
          language: { code: "en" },
          components: templateComponents,
        },
      }),
      signal: controller.signal,
    });

    const metaJson = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok) {
      return {
        ok: false,
        error: metaJson.error?.message || `Meta Cloud API HTTP ${metaRes.status}`,
      };
    }

    return {
      ok: true,
      wamid: metaJson.messages?.[0]?.id || null,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.name === "AbortError" ? "Meta WhatsApp API request timed out" : err?.message || "Network error",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Automatically checks consent & credentials, generates signed private invoice PDF,
 * creates an idempotent delivery job, and sends via official Meta Cloud API.
 * Never throws or blocks POS bill closing.
 */
export async function queueAndSendWhatsAppInvoice(
  orderId: string,
  options?: {
    skipImmediateDispatch?: boolean;
    baseUrl?: string;
    transport?: WhatsAppTransport;
  }
): Promise<{
  queued: boolean;
  queueId?: string;
  status: string;
  reason?: string;
}> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tenant: { include: { settings: true } },
        outlet: true,
        items: true,
        invoice: true,
        table: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!order) return { queued: false, status: "NOT_CONFIGURED", reason: "Order not found" };

    const rawPhone = order.customerPhone || "";
    const normalizedPhone = normalizeWhatsAppPhone(rawPhone);
    if (!normalizedPhone || normalizedPhone.length < 10) {
      await prisma.order
        .update({ where: { id: order.id }, data: { whatsappStatus: "NOT_CONFIGURED" } })
        .catch(() => {});
      return { queued: false, status: "NOT_CONFIGURED", reason: "Customer phone not provided" };
    }

    // Check explicit customer opt-out (never send if opted out)
    const consentRecord = await prisma.customerConsent.findUnique({
      where: {
        tenantId_phone_channel: {
          tenantId: order.tenantId,
          phone: normalizedPhone,
          channel: "WHATSAPP",
        },
      },
    });
    const rawConsent = await prisma.customerConsent.findUnique({
      where: {
        tenantId_phone_channel: {
          tenantId: order.tenantId,
          phone: rawPhone.trim(),
          channel: "WHATSAPP",
        },
      },
    });

    if (consentRecord?.optIn === false || rawConsent?.optIn === false) {
      await prisma.order
        .update({ where: { id: order.id }, data: { whatsappStatus: "OPTED_OUT" } })
        .catch(() => {});
      return {
        queued: false,
        status: "OPTED_OUT",
        reason: "Customer opted out of WhatsApp invoice delivery",
      };
    }

    const cfg = await resolveWhatsAppConfig(order.tenantId, order.outletId);

    if (!cfg.enabled || !cfg.phoneNumberId || !cfg.accessToken) {
      await prisma.order
        .update({ where: { id: order.id }, data: { whatsappStatus: "NOT_CONFIGURED" } })
        .catch(() => {});
      return {
        queued: false,
        status: "NOT_CONFIGURED",
        reason: !cfg.enabled
          ? "Automatic WhatsApp invoice delivery is disabled"
          : "Meta WhatsApp Business Phone Number ID or Access Token not configured",
      };
    }

    const idempotencyKey = `inv_bill_${order.id}`;

    // Idempotency guard: return existing job without creating duplicate delivery
    const existingQueue = await prisma.whatsAppMessageQueue.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId: order.tenantId,
          idempotencyKey,
        },
      },
    });

    if (existingQueue) {
      return {
        queued: true,
        queueId: existingQueue.id,
        status: existingQueue.status,
        reason: "Already queued/processed idempotently",
      };
    }

    // Generate & save invoice PDF in Supabase private bucket (best effort, never fails bill)
    let pdfUrl = order.invoice?.fileUrl || null;
    const invoiceNumber = order.invoice?.invoiceNumber || `INV-${order.orderNumber.replace("ORD-", "")}`;
    try {
      const persisted = await generateAndPersistInvoicePdf(order.id, options?.baseUrl);
      if (persisted?.signedPdfUrl) {
        pdfUrl = persisted.signedPdfUrl;
      }
    } catch (pdfErr) {
      console.warn("[WhatsApp] PDF storage persistence warning:", pdfErr);
    }
    if (!pdfUrl) {
      pdfUrl = buildSignedInvoicePdfUrl(order.tenantId, invoiceNumber, options?.baseUrl);
    }

    const orderDate = new Date(order.createdAt);
    const dateStr = orderDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = orderDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const payment = order.payments?.[0];
    const isPaid = order.isPaid || payment?.status === "COMPLETED";

    const messageText = formatWhatsAppBillMessage({
      restaurantName: order.tenant.settings?.receiptHeader || order.tenant.name,
      customerName: order.customerName || "Valued Guest",
      invoiceNumber,
      orderType: order.type,
      tableNumber: order.table?.number || null,
      invoiceDate: dateStr,
      invoiceTime: timeStr,
      items: order.items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        unitPricePaise: it.unitPricePaise,
        totalPaise: it.totalPaise,
      })),
      subtotalPaise: order.subtotalPaise,
      discountPaise: order.discountPaise,
      cgstPaise: Math.floor(order.taxPaise / 2),
      sgstPaise: order.taxPaise - Math.floor(order.taxPaise / 2),
      otherTaxesPaise: order.serviceChargePaise || 0,
      totalPaise: order.totalPaise,
      paymentMethod: payment?.method || (isPaid ? "UPI" : "UNPAID"),
      paymentStatus: isPaid ? "PAID" : "UNPAID",
      transactionId: payment?.reference || order.orderNumber,
      outletName: order.outlet.name,
      pdfUrl,
    });

    let queueRecord;
    try {
      queueRecord = await prisma.whatsAppMessageQueue.create({
        data: {
          tenantId: order.tenantId,
          outletId: order.outletId,
          orderId: order.id,
          invoiceId: order.invoice?.id || null,
          invoiceNumber,
          recipientPhone: normalizedPhone,
          customerName: order.customerName || "Valued Guest",
          messageType: "INVOICE_BILL",
          idempotencyKey,
          status: "QUEUED",
          pdfUrl,
          messageText,
        },
      });
    } catch (createErr: any) {
      if (createErr?.code === "P2002") {
        const raceExisting = await prisma.whatsAppMessageQueue.findUnique({
          where: {
            tenantId_idempotencyKey: {
              tenantId: order.tenantId,
              idempotencyKey,
            },
          },
        });
        if (raceExisting) {
          return {
            queued: true,
            queueId: raceExisting.id,
            status: raceExisting.status,
            reason: "Already queued idempotently",
          };
        }
      }
      throw createErr;
    }

    await prisma.order
      .update({
        where: { id: order.id },
        data: { whatsappStatus: "QUEUED" },
      })
      .catch(() => {});

    if (options?.skipImmediateDispatch) {
      return { queued: true, queueId: queueRecord.id, status: "QUEUED" };
    }

    const dispatchResult = await dispatchWhatsAppQueueItem(queueRecord.id, options?.transport);
    return {
      queued: true,
      queueId: queueRecord.id,
      status: dispatchResult.status,
      reason: dispatchResult.error,
    };
  } catch (err: any) {
    console.error("[WhatsApp] queueAndSendWhatsAppInvoice error:", err);
    return {
      queued: false,
      status: "FAILED",
      reason: err.message || "Failed to queue WhatsApp message",
    };
  }
}

/**
 * Dispatches an individual queued WhatsApp bill item using the official Meta Cloud API.
 */
export async function dispatchWhatsAppQueueItem(
  queueId: string,
  transport: WhatsAppTransport = defaultMetaWhatsAppTransport
): Promise<{
  success: boolean;
  status: string;
  error?: string;
  wamid?: string | null;
}> {
  const item = await prisma.whatsAppMessageQueue.findUnique({
    where: { id: queueId },
    include: {
      tenant: { include: { settings: true } },
      order: { include: { outlet: true, invoice: true, payments: { take: 1, orderBy: { createdAt: "desc" } } } },
    },
  });

  if (!item) return { success: false, status: "NOT_FOUND", error: "Queue item not found" };

  // Avoid duplicating already-delivered/sent jobs during retry worker passes unless explicitly reset to QUEUED
  if (item.status === "SENT" || item.status === "DELIVERED" || item.status === "READ") {
    return { success: true, status: item.status, wamid: item.wamid };
  }

  const cfg = await resolveWhatsAppConfig(item.tenantId, item.outletId);

  if (!cfg.phoneNumberId || !cfg.accessToken) {
    await prisma.whatsAppMessageQueue.update({
      where: { id: queueId },
      data: {
        status: "NOT_CONFIGURED",
        lastError: "WhatsApp Business Phone Number ID or Access Token missing",
        updatedAt: new Date(),
      },
    });
    await prisma.order
      .update({ where: { id: item.orderId }, data: { whatsappStatus: "NOT_CONFIGURED" } })
      .catch(() => {});
    return {
      success: false,
      status: "NOT_CONFIGURED",
      error: "WhatsApp Business credentials not configured",
    };
  }

  // Transition to SENDING
  await prisma.whatsAppMessageQueue.update({
    where: { id: queueId },
    data: { status: "SENDING", updatedAt: new Date() },
  });

  const order = item.order;
  const restaurantName = item.tenant.settings?.receiptHeader || item.tenant.name;
  const invoiceNumber = item.invoiceNumber || order?.invoice?.invoiceNumber || order?.orderNumber || "INV";
  const totalFormatted = formatINR(order?.totalPaise || 0);
  const outletName = order?.outlet?.name || "Main Outlet";

  const transportRes = await transport({
    phoneNumberId: cfg.phoneNumberId,
    accessToken: cfg.accessToken,
    to: item.recipientPhone,
    templateName: cfg.templateName,
    pdfUrl: item.pdfUrl,
    invoiceNumber,
    messageText: item.messageText || "",
    bodyParams: [
      item.customerName || "Valued Guest",
      restaurantName,
      invoiceNumber,
      totalFormatted,
      outletName,
    ],
  });

  const now = new Date();
  const nextStatus = transportRes.ok ? "SENT" : "FAILED";
  const wamid = transportRes.ok ? transportRes.wamid || null : null;
  const errorMsg = transportRes.ok ? null : transportRes.error || "Meta Cloud API delivery failed";

  const nextRetryCount = item.retryCount + (nextStatus === "FAILED" ? 1 : 0);
  const nextRetryAt =
    nextStatus === "FAILED" && nextRetryCount < item.maxRetries
      ? new Date(Date.now() + 60_000 * Math.pow(2, item.retryCount))
      : null;

  await prisma.whatsAppMessageQueue.update({
    where: { id: queueId },
    data: {
      status: nextStatus,
      wamid,
      lastError: errorMsg,
      sentAt: nextStatus === "SENT" ? now : undefined,
      retryCount: nextRetryCount,
      nextRetryAt,
      updatedAt: now,
    },
  });

  if (item.orderId) {
    await prisma.order
      .update({
        where: { id: item.orderId },
        data: { whatsappStatus: nextStatus },
      })
      .catch(() => {});
  }

  await prisma.whatsAppDeliveryLog.create({
    data: {
      tenantId: item.tenantId,
      outletId: item.outletId,
      orderId: item.orderId,
      recipientPhone: item.recipientPhone,
      templateName: cfg.templateName,
      messageId: wamid,
      status: nextStatus,
      errorMessage: errorMsg,
      invoiceUrl: item.pdfUrl,
      metadataJson: JSON.stringify({
        invoiceNumber,
        queueId: item.id,
        retryCount: nextRetryCount,
        configSource: cfg.source,
      }),
    },
  });

  return {
    success: nextStatus === "SENT",
    status: nextStatus,
    error: errorMsg || undefined,
    wamid,
  };
}
