import crypto from "crypto";
import { prisma } from "@/lib/db";

export interface PublicInvoiceVerificationResult {
  ok: boolean;
  error?: "NOT_FOUND" | "REVOKED" | "EXPIRED" | "INVALID_TOKEN";
  invoice?: {
    id: string;
    invoiceNumber: string;
    publicToken: string;
    tokenExpiresAt: Date | null;
    createdAt: Date;
    restaurantName: string;
    restaurantLogo: string | null;
    outletName: string;
    outletAddress: string | null;
    outletCity: string | null;
    outletPhone: string | null;
    gstin: string | null;
    fssai: string | null;
    orderNumber: string;
    orderType: string;
    tableName: string | null;
    customerName: string | null;
    customerPhone: string | null;
    items: Array<{
      name: string;
      quantity: number;
      unitPricePaise: number;
      totalPaise: number;
      modifiers?: Array<{ name: string; pricePaise?: number }>;
      notes?: string | null;
    }>;
    subtotalPaise: number;
    discountPaise: number;
    taxPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    totalPaise: number;
    paidPaise: number;
    balanceDuePaise: number;
    paymentSummary: string;
    paymentStatus: "PAID" | "UNPAID" | "PARTIALLY_PAID";
    payments: Array<{
      method: string;
      amountPaise: number;
      status: string;
      reference?: string | null;
      createdAt: Date;
    }>;
    pdfDownloadUrl: string;
  };
}

/**
 * Generate a cryptographically unguessable, URL-safe public token for an invoice.
 */
export function generateUnguessableToken(): string {
  const bytes = crypto.randomBytes(24);
  return `tok_${bytes.toString("base64url")}`;
}

/**
 * Generate and attach a public token to an invoice record if not already present.
 */
export async function ensureInvoicePublicToken(params: {
  orderId: string;
  tenantId: string;
  outletId?: string;
  expiresInDays?: number;
}): Promise<{ publicToken: string; tokenExpiresAt: Date }> {
  const expiresInDays = params.expiresInDays ?? 90;
  const tokenExpiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const existing = await prisma.invoiceRecord.findUnique({
    where: { orderId: params.orderId },
  });

  if (existing?.publicToken && !existing.tokenRevoked) {
    return {
      publicToken: existing.publicToken,
      tokenExpiresAt: existing.tokenExpiresAt || tokenExpiresAt,
    };
  }

  const publicToken = generateUnguessableToken();

  if (existing) {
    await prisma.invoiceRecord.update({
      where: { id: existing.id },
      data: {
        publicToken,
        tokenExpiresAt,
        tokenRevoked: false,
      },
    });
  }

  return { publicToken, tokenExpiresAt };
}

/**
 * Verify public token and retrieve sanitized invoice details for customer viewing.
 * Prevents cross-tenant access and ensures expired or revoked tokens are blocked.
 */
export async function verifyInvoicePublicToken(
  token: string,
  origin?: string
): Promise<PublicInvoiceVerificationResult> {
  const clean = token?.trim();
  if (!clean || !clean.startsWith("tok_")) {
    return { ok: false, error: "INVALID_TOKEN" };
  }

  const invoice = await prisma.invoiceRecord.findFirst({
    where: { publicToken: clean },
    include: {
      order: {
        include: {
          items: {
            include: { addons: true },
          },
          payments: {
            orderBy: { createdAt: "asc" },
          },
          table: true,
        },
      },
      tenant: {
        include: {
          settings: true,
        },
      },
    },
  });

  if (!invoice) {
    return { ok: false, error: "NOT_FOUND" };
  }

  if (invoice.tokenRevoked) {
    return { ok: false, error: "REVOKED" };
  }

  if (invoice.tokenExpiresAt && new Date() > invoice.tokenExpiresAt) {
    return { ok: false, error: "EXPIRED" };
  }

  // Increment view counter asynchronously (non-blocking)
  prisma.invoiceRecord
    .update({
      where: { id: invoice.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    })
    .catch(() => {});

  const order = invoice.order;
  const tenant = invoice.tenant;
  const settings = tenant?.settings;

  // Outlet lookup
  const outlet = await prisma.outlet.findUnique({
    where: { id: invoice.outletId },
  });

  // Calculate actual payment status from persisted records
  const recordedPayments = order?.payments || [];
  const completedPayments = recordedPayments.filter(
    (p) => p.status === "COMPLETED" || p.status === "PAID" || p.status === "CAPTURED"
  );

  const totalPaise = invoice.totalPaise;
  const paidPaise = completedPayments.reduce((acc, p) => acc + p.amountPaise, 0);
  const balanceDuePaise = Math.max(0, totalPaise - paidPaise);

  let paymentStatus: "PAID" | "UNPAID" | "PARTIALLY_PAID" = "PAID";
  let paymentSummary = "PAID";

  if (paidPaise === 0) {
    paymentStatus = "UNPAID";
    paymentSummary = "UNPAID";
  } else if (balanceDuePaise > 0) {
    paymentStatus = "PARTIALLY_PAID";
    paymentSummary = `PARTIALLY PAID (Paid: Rs.${(paidPaise / 100).toFixed(2)}, Due: Rs.${(balanceDuePaise / 100).toFixed(2)})`;
  } else {
    paymentStatus = "PAID";
    if (completedPayments.length > 1) {
      paymentSummary = completedPayments
        .map((p) => `${p.method.toUpperCase()} Rs.${(p.amountPaise / 100).toFixed(2)}`)
        .join(" + ");
    } else if (completedPayments.length === 1) {
      paymentSummary = completedPayments[0].method.toUpperCase();
    } else {
      paymentSummary = "PAID";
    }
  }

  const items = (order?.items || []).map((it) => {
    let modifiers: Array<{ name: string; pricePaise?: number }> = [];
    if (Array.isArray(it.addons) && it.addons.length > 0) {
      modifiers = it.addons.map((a) => ({
        name: a.optionNameSnapshot,
        pricePaise: a.pricePaiseSnapshot,
      }));
    } else if (it.modifiersJson) {
      try {
        const parsed = JSON.parse(it.modifiersJson);
        if (Array.isArray(parsed)) modifiers = parsed;
      } catch {}
    }
    return {
      name: it.name,
      quantity: it.quantity,
      unitPricePaise: it.unitPricePaise,
      totalPaise: it.totalPaise,
      modifiers,
      notes: it.notes,
    };
  });

  const base = origin || "";
  const pdfDownloadUrl = `${base}/api/invoices/${encodeURIComponent(invoice.invoiceNumber)}/pdf?tenantId=${encodeURIComponent(invoice.tenantId)}`;

  return {
    ok: true,
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      publicToken: invoice.publicToken!,
      tokenExpiresAt: invoice.tokenExpiresAt,
      createdAt: invoice.createdAt,
      restaurantName: settings?.receiptHeader || tenant?.name || "RestroNex Restaurant",
      restaurantLogo: settings?.logoUrl || tenant?.logoUrl || null,
      outletName: outlet?.name || "Main Outlet",
      outletAddress: outlet?.address || null,
      outletCity: outlet?.city || null,
      outletPhone: outlet?.phone || null,
      gstin: settings?.gstNumber || null,
      fssai: settings?.fssaiNumber || null,
      orderNumber: order?.orderNumber || "ORD-000",
      orderType: order?.type || "DINE_IN",
      tableName: order?.table?.number || null,
      customerName: invoice.customerName || order?.customerName || null,
      customerPhone: invoice.customerPhone || order?.customerPhone || null,
      items,
      subtotalPaise: invoice.subtotalPaise,
      discountPaise: invoice.discountPaise,
      taxPaise: invoice.taxPaise,
      cgstPaise: Math.floor(invoice.taxPaise / 2),
      sgstPaise: invoice.taxPaise - Math.floor(invoice.taxPaise / 2),
      totalPaise: invoice.totalPaise,
      paidPaise,
      balanceDuePaise,
      paymentSummary,
      paymentStatus,
      payments: recordedPayments.map((p) => ({
        method: p.method,
        amountPaise: p.amountPaise,
        status: p.status,
        reference: p.reference,
        createdAt: p.createdAt,
      })),
      pdfDownloadUrl,
    },
  };
}

/**
 * Revoke an existing public token for security or reissue purposes.
 */
export async function revokeInvoicePublicToken(params: {
  invoiceId?: string;
  orderId?: string;
  tenantId: string;
}): Promise<boolean> {
  const where: any = { tenantId: params.tenantId };
  if (params.invoiceId) where.id = params.invoiceId;
  else if (params.orderId) where.orderId = params.orderId;
  else return false;

  await prisma.invoiceRecord.updateMany({
    where,
    data: { tokenRevoked: true },
  });
  return true;
}

/**
 * Regenerate a fresh unguessable token, invalidating prior links.
 */
export async function regenerateInvoicePublicToken(params: {
  invoiceId?: string;
  orderId?: string;
  tenantId: string;
  expiresInDays?: number;
}): Promise<{ publicToken: string; tokenExpiresAt: Date } | null> {
  const where: any = { tenantId: params.tenantId };
  if (params.invoiceId) where.id = params.invoiceId;
  else if (params.orderId) where.orderId = params.orderId;
  else return null;

  const invoice = await prisma.invoiceRecord.findFirst({ where });
  if (!invoice) return null;

  const publicToken = generateUnguessableToken();
  const expiresInDays = params.expiresInDays ?? 90;
  const tokenExpiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await prisma.invoiceRecord.update({
    where: { id: invoice.id },
    data: {
      publicToken,
      tokenExpiresAt,
      tokenRevoked: false,
    },
  });

  return { publicToken, tokenExpiresAt };
}
