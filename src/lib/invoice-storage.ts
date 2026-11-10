import crypto from "crypto";
import { prisma } from "./db";
import { generateInvoicePDF, InvoicePDFData } from "./invoice-pdf";
import { createSupabaseAdminClient } from "./supabase";
import { STORAGE_BUCKETS } from "./supabase-storage";

function getInvoiceSigningKey(): string {
  return (
    process.env.INVOICE_SIGNING_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.JWT_SECRET ||
    "restronex-invoice-signing-dev-key"
  );
}

export function signInvoiceAccessToken(
  tenantId: string,
  invoiceNumber: string,
  ttlSeconds = 60 * 60 * 24 * 7
): { exp: number; sig: string } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${tenantId}:${invoiceNumber}:${exp}`;
  const sig = crypto
    .createHmac("sha256", getInvoiceSigningKey())
    .update(payload)
    .digest("base64url");
  return { exp, sig };
}

export function verifyInvoiceAccessToken(
  tenantId: string,
  invoiceNumber: string,
  expStr: string | null,
  sig: string | null
): boolean {
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Math.floor(Date.now() / 1000) > exp) return false;

  const expected = crypto
    .createHmac("sha256", getInvoiceSigningKey())
    .update(`${tenantId}:${invoiceNumber}:${exp}`)
    .digest("base64url");

  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function buildSignedInvoicePdfUrl(
  tenantId: string,
  invoiceNumber: string,
  baseUrl?: string
): string {
  const origin =
    (baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://www.restronexpos.com").replace(/\/$/, "");
  const { exp, sig } = signInvoiceAccessToken(tenantId, invoiceNumber);
  return `${origin}/api/invoices/${encodeURIComponent(invoiceNumber)}/pdf?tid=${encodeURIComponent(tenantId)}&exp=${exp}&sig=${encodeURIComponent(sig)}`;
}

export async function loadInvoicePdfPayload(invoiceNumber: string, tenantId?: string) {
  const invoice = await prisma.invoiceRecord.findFirst({
    where: tenantId ? { tenantId, invoiceNumber } : { invoiceNumber },
    include: {
      tenant: { include: { settings: true } },
      order: {
        include: {
          items: true,
          outlet: true,
          table: true,
          payments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!invoice || !invoice.order) return null;

  const order = invoice.order;
  const tenant = invoice.tenant;
  const outlet = order.outlet;
  const setting = tenant.settings;
  const payment = order.payments?.[0];

  const orderDate = new Date(order.createdAt);
  const dateFormatted = orderDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeFormatted = orderDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const isPaid = order.isPaid || payment?.status === "COMPLETED";

  const pdfData: InvoicePDFData = {
    restaurantName: setting?.receiptHeader || tenant.name || "RestroNex Restaurant",
    outletName: outlet.name,
    outletAddress: outlet.address,
    outletCity: outlet.city,
    outletPhone: outlet.phone,
    gstin: setting?.gstNumber || null,
    fssai: setting?.fssaiNumber || null,
    invoiceNumber: invoice.invoiceNumber,
    orderNumber: order.orderNumber,
    date: dateFormatted,
    time: timeFormatted,
    orderType: order.type,
    tableName: order.table?.number || null,
    staffName: "Staff POS",
    customerName: invoice.customerName || order.customerName || "Valued Guest",
    customerPhone: invoice.customerPhone || order.customerPhone || null,
    items: order.items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      unitPricePaise: it.unitPricePaise,
      totalPaise: it.totalPaise,
    })),
    subtotalPaise: invoice.subtotalPaise,
    discountPaise: invoice.discountPaise,
    cgstPaise: Math.floor(invoice.taxPaise / 2),
    sgstPaise: invoice.taxPaise - Math.floor(invoice.taxPaise / 2),
    otherTaxesPaise: order.serviceChargePaise || 0,
    totalPaise: invoice.totalPaise,
    paymentMethod: payment?.method || (order.isPaid ? "UPI" : "UNPAID"),
    paymentStatus: isPaid ? "PAID" : "UNPAID",
    transactionId: payment?.reference || order.orderNumber,
  };

  return { invoice, pdfData };
}

/**
 * Generates invoice PDF and persists to Supabase Storage private bucket `restaurant-documents`
 * under tenant-isolated path `${tenantId}/invoices/${invoiceNumber}.pdf`.
 */
export async function generateAndPersistInvoicePdf(
  orderId: string,
  baseUrl?: string
): Promise<{
  invoiceNumber: string;
  pdfBuffer: Buffer;
  pdfStoragePath: string | null;
  signedPdfUrl: string;
} | null> {
  const inv = await prisma.invoiceRecord.findUnique({ where: { orderId } });
  if (!inv) return null;

  const payload = await loadInvoicePdfPayload(inv.invoiceNumber, inv.tenantId);
  if (!payload) return null;

  const pdfBuffer = await generateInvoicePDF(payload.pdfData);
  const signedPdfUrl = buildSignedInvoicePdfUrl(inv.tenantId, inv.invoiceNumber, baseUrl);
  const targetPath = `${inv.tenantId}/receipts/${inv.invoiceNumber}.pdf`;
  let storedPath: string | null = inv.pdfStoragePath || null;

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const admin = createSupabaseAdminClient();
      const { data, error } = await admin.storage
        .from(STORAGE_BUCKETS.PRIVATE_DOCS)
        .upload(targetPath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (!error && data?.path) {
        storedPath = data.path;
      }
    }
  } catch (err) {
    console.warn("[InvoiceStorage] Private Supabase Storage upload skipped:", err);
  }

  await prisma.invoiceRecord
    .update({
      where: { id: inv.id },
      data: {
        pdfStoragePath: storedPath,
        fileUrl: signedPdfUrl,
      },
    })
    .catch(() => {});

  return {
    invoiceNumber: inv.invoiceNumber,
    pdfBuffer,
    pdfStoragePath: storedPath,
    signedPdfUrl,
  };
}

