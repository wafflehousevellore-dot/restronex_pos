import net from "net";
import QRCode from "qrcode";
import { prisma } from "./db";
import { buildSignedInvoicePdfUrl } from "./invoice-storage";

export type PrinterProtocol =
  | "USB_THERMAL"
  | "NETWORK_LAN"
  | "BLUETOOTH_THERMAL"
  | "LOCAL_BRIDGE"
  | "OS_PRINT_SERVICE";

export type PrintStatus =
  | "NOT_CONFIGURED"
  | "QUEUED"
  | "PRINTING"
  | "PRINT_REQUESTED"
  | "PRINTED"
  | "OFFLINE"
  | "FAILED";

export type PrinterCompatibilityInfo = {
  protocol: PrinterProtocol;
  label: string;
  supportsSilentPrint: boolean;
  hardwareFeedback: "HARDWARE_ACK" | "BRIDGE_ACK" | "OS_QUEUE_ONLY";
  limitationNote: string;
};

export function getPrinterCompatibility(protocol: string): PrinterCompatibilityInfo {
  switch (protocol) {
    case "NETWORK_LAN":
      return {
        protocol: "NETWORK_LAN",
        label: "Network / Ethernet LAN (Port 9100)",
        supportsSilentPrint: true,
        hardwareFeedback: "HARDWARE_ACK",
        limitationNote:
          "Silent ESC/POS printing when same LAN / reachable TCP host:9100 or local bridge is active. Private LAN IPs require RestroNex Print Bridge when hosted in cloud.",
      };
    case "LOCAL_BRIDGE":
      return {
        protocol: "LOCAL_BRIDGE",
        label: "Local Print Bridge / Spooler Agent",
        supportsSilentPrint: true,
        hardwareFeedback: "BRIDGE_ACK",
        limitationNote:
          "Silent printing to any USB, Serial, or OS thermal printer connected to the restaurant counter PC via local agent (e.g. http://127.0.0.1:9111).",
      };
    case "USB_THERMAL":
      return {
        protocol: "USB_THERMAL",
        label: "USB Direct Thermal (WebUSB)",
        supportsSilentPrint: true,
        hardwareFeedback: "HARDWARE_ACK",
        limitationNote:
          "Silent in Chrome/Edge after one-time USB device permission grant. Windows/macOS drivers may claim the USB interface unless using Local Print Bridge.",
      };
    case "BLUETOOTH_THERMAL":
      return {
        protocol: "BLUETOOTH_THERMAL",
        label: "Supported Bluetooth Thermal (BLE GATT)",
        supportsSilentPrint: true,
        hardwareFeedback: "HARDWARE_ACK",
        limitationNote:
          "Supports BLE GATT thermal printers on Chrome (Android/macOS). iOS Safari & Classic SPP Bluetooth printers require Android native app or Local Print Bridge.",
      };
    default:
      return {
        protocol: "OS_PRINT_SERVICE",
        label: "OS Print Service / Browser Kiosk",
        supportsSilentPrint: false,
        hardwareFeedback: "OS_QUEUE_ONLY",
        limitationNote:
          "Dispatches to browser/OS print spooler. Silent without dialogs only when browser runs in kiosk mode (--kiosk-printing). Reports PRINT_REQUESTED because OS dialogs do not return paper-out confirmation.",
      };
  }
}

export interface ThermalReceiptInput {
  restaurantName: string;
  logoUrl?: string | null;
  outletName: string;
  outletAddress?: string | null;
  outletCity?: string | null;
  outletPhone?: string | null;
  gstin?: string | null;
  fssai?: string | null;
  invoiceNumber: string;
  orderNumber: string;
  dateStr: string;
  timeStr: string;
  orderType: string;
  tableName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  items: { name: string; quantity: number; unitPricePaise: number; totalPaise: number }[];
  subtotalPaise: number;
  discountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  otherTaxesPaise: number;
  totalPaise: number;
  paymentMethod: string;
  paymentStatus: "PAID" | "UNPAID" | "REFUNDED";
  transactionId?: string | null;
  qrData?: string | null;
  footerText?: string | null;
}

function formatReceiptMoney(paise: number): string {
  return `Rs.${(paise / 100).toFixed(2)}`;
}

function centerLine(text: string, width: number): string {
  const trimmed = text.trim().slice(0, width);
  const pad = Math.max(0, Math.floor((width - trimmed.length) / 2));
  return " ".repeat(pad) + trimmed;
}

function twoColLine(left: string, right: string, width: number): string {
  const r = right.trim();
  const maxLeft = Math.max(4, width - r.length - 1);
  const l = left.trim().slice(0, maxLeft);
  const gap = Math.max(1, width - l.length - r.length);
  return `${l}${" ".repeat(gap)}${r}`;
}

export function buildEscPosQrRasterCentered(text: string, is58mm = true): Buffer {
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
    const size = qr.modules.size;
    const data = qr.modules.data;
    const margin = 1; // 1-module margin for compact thermal slip
    const scale = is58mm ? 4 : 5;
    const qrPixels = (size + margin * 2) * scale;
    const qrByteWidth = Math.ceil(qrPixels / 8);
    const pixelHeight = qrPixels;

    // Line widths in bytes: 58mm = 48 bytes (384 dots), 80mm = 72 bytes (576 dots)
    const targetLineBytes = is58mm ? 48 : 72;
    const leftPaddingBytes = Math.max(0, Math.floor((targetLineBytes - qrByteWidth) / 2));
    const totalLineBytes = targetLineBytes;

    const totalRasterBytes = totalLineBytes * pixelHeight;
    const raster = Buffer.alloc(totalRasterBytes, 0);

    for (let y = 0; y < pixelHeight; y++) {
      const modY = Math.floor(y / scale) - margin;
      for (let x = 0; x < qrPixels; x++) {
        const modX = Math.floor(x / scale) - margin;
        if (modY >= 0 && modY < size && modX >= 0 && modX < size) {
          if (data[modY * size + modX]) {
            const byteIndex = y * totalLineBytes + leftPaddingBytes + Math.floor(x / 8);
            const bitOffset = 7 - (x % 8);
            raster[byteIndex] |= (1 << bitOffset);
          }
        }
      }
    }

    const xL = totalLineBytes & 0xff;
    const xH = (totalLineBytes >> 8) & 0xff;
    const yL = pixelHeight & 0xff;
    const yH = (pixelHeight >> 8) & 0xff;

    // Universal ESC/POS GS v 0 raster bit image command
    return Buffer.concat([
      Buffer.from([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]),
      raster,
      Buffer.from([0x0a]),
    ]);
  } catch (err) {
    console.error("[ESC/POS] Failed to build QR raster:", err);
    return Buffer.alloc(0);
  }
}

export function formatThermalReceipt(
  input: ThermalReceiptInput,
  paperWidth: "58mm" | "80mm" = "80mm"
): {
  paperWidth: "58mm" | "80mm";
  columns: number;
  textLines: string[];
  escPosBase64: string;
} {
  const is58mm = paperWidth === "58mm";
  const cols = is58mm ? 32 : 48;
  const eq = "=".repeat(cols);
  const dash = "-".repeat(cols);

  const lines: string[] = [];
  if (input.logoUrl) {
    lines.push(centerLine(`[LOGO] ${input.restaurantName.toUpperCase()}`, cols));
  } else {
    lines.push(centerLine(input.restaurantName.toUpperCase(), cols));
  }
  lines.push(centerLine(input.outletName, cols));
  if (input.outletAddress || input.outletCity) {
    lines.push(
      centerLine([input.outletAddress, input.outletCity].filter(Boolean).join(", "), cols)
    );
  }
  if (input.outletPhone) lines.push(centerLine(`Tel: ${input.outletPhone}`, cols));
  if (input.gstin) lines.push(centerLine(`GSTIN: ${input.gstin}`, cols));
  if (input.fssai) lines.push(centerLine(`FSSAI: ${input.fssai}`, cols));

  lines.push(eq);
  lines.push(centerLine("TAX INVOICE", cols));
  lines.push(dash);
  lines.push(twoColLine(`Inv: ${input.invoiceNumber}`, input.dateStr, cols));
  lines.push(twoColLine(`Ord: ${input.orderNumber}`, input.timeStr, cols));
  lines.push(
    twoColLine(
      `Type: ${(input.orderType || "DINE_IN").replace("_", " ")}`,
      input.tableName ? `Tbl: ${input.tableName}` : "Counter",
      cols
    )
  );
  if (input.customerName || input.customerPhone) {
    lines.push(
      twoColLine(
        `Guest: ${input.customerName || "Walk-in"}`,
        input.customerPhone || "",
        cols
      )
    );
  }

  lines.push(dash);
  lines.push(twoColLine("ITEM (QTY)", "AMOUNT", cols));
  lines.push(dash);

  for (const it of input.items) {
    const label = `${it.quantity}x ${it.name}`;
    lines.push(twoColLine(label, formatReceiptMoney(it.totalPaise), cols));
  }

  lines.push(dash);
  lines.push(twoColLine("Subtotal", formatReceiptMoney(input.subtotalPaise), cols));
  if (input.discountPaise > 0) {
    lines.push(twoColLine("Discount", `-${formatReceiptMoney(input.discountPaise)}`, cols));
  }
  lines.push(twoColLine("CGST (9%)", formatReceiptMoney(input.cgstPaise), cols));
  lines.push(twoColLine("SGST (9%)", formatReceiptMoney(input.sgstPaise), cols));
  if (input.otherTaxesPaise > 0) {
    lines.push(twoColLine("Other Taxes", formatReceiptMoney(input.otherTaxesPaise), cols));
  }
  lines.push(eq);
  lines.push(twoColLine("TOTAL AMOUNT", formatReceiptMoney(input.totalPaise), cols));
  lines.push(eq);
  lines.push(twoColLine(`Pay: ${input.paymentMethod}`, input.paymentStatus, cols));
  if (input.transactionId) {
    lines.push(twoColLine("Txn ID", input.transactionId, cols));
  }

  // Pre-QR text lines
  const preQrLines = [...lines];

  // QR banner lines
  const qrLines: string[] = [];
  let extractedUpiVpa = "";
  if (input.qrData) {
    qrLines.push(dash);
    if (input.qrData.startsWith("upi://")) {
      qrLines.push(centerLine("SCAN TO PAY WITH ANY UPI APP", cols));
      qrLines.push(centerLine("GPay • PhonePe • Paytm • BHIM", cols));
      const upiMatch = input.qrData.match(/pa=([^&]+)/);
      if (upiMatch) extractedUpiVpa = decodeURIComponent(upiMatch[1]);
    } else {
      qrLines.push(centerLine("Scan QR for Digital Invoice PDF", cols));
    }
    qrLines.push(dash);
  }

  // Post-QR lines
  const postQrLines: string[] = [];
  if (extractedUpiVpa) {
    postQrLines.push(centerLine(`UPI ID: ${extractedUpiVpa}`, cols));
    postQrLines.push(dash);
  }
  postQrLines.push(centerLine(input.footerText || "Thank you for dining with us!", cols));
  postQrLines.push(centerLine("Powered by RestroNex - Restaurant OS", cols));

  // Full human-readable textLines array
  const fullTextLines = [...preQrLines, ...qrLines, ...postQrLines];

  // Build authentic ESC/POS binary command stream
  const chunks: Buffer[] = [
    Buffer.from([0x1b, 0x40]), // ESC @ Initialize printer
    Buffer.from([0x1b, 0x61, 0x01]), // Center align
    Buffer.from([0x1b, 0x45, 0x01]), // Bold ON
    Buffer.from(`${input.restaurantName.toUpperCase()}\n`, "ascii"),
    Buffer.from([0x1b, 0x45, 0x00]), // Bold OFF
    Buffer.from([0x1b, 0x61, 0x00]), // Left align
    Buffer.from(preQrLines.slice(1).join("\n") + "\n", "ascii"),
  ];

  if (input.qrData) {
    // 1. Text header above QR
    chunks.push(
      Buffer.from([0x1b, 0x61, 0x01]), // Center
      Buffer.from(qrLines.join("\n") + "\n", "ascii")
    );

    // 2. Universal Raster Bitmap QR (GS v 0) - supported by 100% of 58mm & 80mm printers
    const rasterBuffer = buildEscPosQrRasterCentered(input.qrData, is58mm);
    if (rasterBuffer.length > 0) {
      chunks.push(rasterBuffer);
    }
  }

  // Footer & Cut
  chunks.push(
    Buffer.from([0x1b, 0x61, 0x01]), // Center
    Buffer.from(postQrLines.join("\n") + "\n\n\n", "ascii"),
    Buffer.from([0x1d, 0x56, 0x42, 0x00]) // GS V 66 0 Partial Cut
  );

  return {
    paperWidth: is58mm ? "58mm" : "80mm",
    columns: cols,
    textLines: fullTextLines,
    escPosBase64: Buffer.concat(chunks).toString("base64"),
  };
}

function isPrivateIpAddress(host: string): boolean {
  const h = host.trim().toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  if (h.startsWith("192.168.") || h.startsWith("10.")) return true;
  const match = /^172\.(\d+)\./.exec(h);
  if (match) {
    const second = Number(match[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export async function sendRawEscPosTcp(
  connectionString: string,
  payloadBuf: Buffer,
  timeoutMs = 2000
): Promise<{ ok: boolean; error?: string; code?: string }> {
  const [rawHost, rawPort] = connectionString.trim().split(":");
  const host = rawHost?.trim();
  const port = Number(rawPort) || 9100;

  if (!host) {
    return { ok: false, error: "Printer IP address is missing", code: "INVALID_ADDRESS" };
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (res: { ok: boolean; error?: string; code?: string }) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {}
      resolve(res);
    };

    socket.setTimeout(timeoutMs);
    socket.on("timeout", () => {
      finish({ ok: false, error: `Printer ${host}:${port} timed out (offline)`, code: "ETIMEDOUT" });
    });
    socket.on("error", (err: any) => {
      finish({
        ok: false,
        error: err?.message || `Printer ${host}:${port} unreachable`,
        code: err?.code || "ECONNREFUSED",
      });
    });
    socket.connect(port, host, () => {
      socket.write(payloadBuf, (writeErr) => {
        if (writeErr) {
          finish({ ok: false, error: writeErr.message, code: "WRITE_ERROR" });
        } else {
          socket.end(() => finish({ ok: true }));
        }
      });
    });
  });
}

export async function sendToLocalBridge(
  bridgeUrl: string,
  payload: { jobId: string; printerName: string; paperWidth: string; escPosBase64: string; textLines: string[] },
  timeoutMs = 2500
): Promise<{ ok: boolean; status: PrintStatus; error?: string }> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const endpoint = `${bridgeUrl.replace(/\/$/, "")}/print`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: "OFFLINE",
        error: json.error || `Local Print Bridge returned HTTP ${res.status}`,
      };
    }
    return {
      ok: true,
      status: json.printed === true ? "PRINTED" : "PRINT_REQUESTED",
    };
  } catch (err: any) {
    return {
      ok: false,
      status: "OFFLINE",
      error: err?.name === "AbortError" ? "Print bridge timed out" : err?.message || "Bridge unreachable",
    };
  } finally {
    clearTimeout(tid);
  }
}

export async function selectOutletBillingPrinter(tenantId: string, outletId: string) {
  const candidates = await prisma.printerDevice.findMany({
    where: { tenantId, outletId },
    include: { routingRules: true },
    orderBy: [{ isDefaultBilling: "desc" }, { createdAt: "asc" }],
  });

  if (candidates.length === 0) return null;

  const billingExplicit = candidates.find(
    (p) =>
      p.isDefaultBilling ||
      p.station === "BILLING" ||
      p.routingRules.some((r) => r.printBill)
  );
  return billingExplicit || candidates[0];
}

export type PrintTransportOverride = (job: {
  printer: { id: string; name: string; type: string; paperWidth: string; connectionString: string | null; bridgeUrl: string | null };
  escPosBase64: string;
  textLines: string[];
}) => Promise<{ status: PrintStatus; error?: string }>;

/**
 * Selects the outlet's default billing printer, builds 58mm/80mm ESC/POS + structured payload,
 * records an idempotent PrintJob, and executes independent dispatch cleanly.
 * Never throws or blocks POS bill closing.
 */
export async function queueAndDispatchBillPrintJob(
  orderId: string,
  options?: {
    forcePaperWidth?: "58mm" | "80mm";
    baseUrl?: string;
    transport?: PrintTransportOverride;
  }
): Promise<{
  jobId: string | null;
  status: PrintStatus;
  paperWidth: "58mm" | "80mm";
  printerId: string | null;
  printerName: string | null;
  printerType: string | null;
  requiresClientDispatch: boolean;
  escPosBase64?: string;
  textLines?: string[];
  qrData?: string | null;
  error?: string;
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

    if (!order) {
      return {
        jobId: null,
        status: "FAILED",
        paperWidth: "80mm",
        printerId: null,
        printerName: null,
        printerType: null,
        requiresClientDispatch: false,
        error: "Order not found",
      };
    }

    const setting = order.tenant.settings;
    const printer = await selectOutletBillingPrinter(order.tenantId, order.outletId);

    if (setting && !setting.autoPrintBill) {
      await prisma.order
        .update({ where: { id: order.id }, data: { printStatus: "NOT_CONFIGURED" } })
        .catch(() => {});
      return {
        jobId: null,
        status: "NOT_CONFIGURED",
        paperWidth: (printer?.paperWidth === "58mm" ? "58mm" : "80mm"),
        printerId: printer?.id || null,
        printerName: printer?.name || null,
        printerType: printer?.type || null,
        requiresClientDispatch: false,
        error: "Automatic receipt printing is disabled in settings",
      };
    }

    if (!printer || !printer.autoPrintEnabled) {
      await prisma.order
        .update({ where: { id: order.id }, data: { printStatus: "NOT_CONFIGURED" } })
        .catch(() => {});
      return {
        jobId: null,
        status: "NOT_CONFIGURED",
        paperWidth: "80mm",
        printerId: printer?.id || null,
        printerName: printer?.name || null,
        printerType: printer?.type || null,
        requiresClientDispatch: false,
        error: !printer ? "No billing printer configured for this outlet" : "Auto-print paused on selected printer",
      };
    }

    const paperWidth: "58mm" | "80mm" =
      options?.forcePaperWidth || (printer.paperWidth === "58mm" ? "58mm" : "80mm");

    const idempotencyKey = `bill_print_${order.id}`;
    const existingJob = await prisma.printJob.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId: order.tenantId,
          idempotencyKey,
        },
      },
    });

    const invoiceNumber =
      order.invoice?.invoiceNumber || `INV-${order.orderNumber.replace("ORD-", "")}`;

    const orderDate = new Date(order.createdAt);
    const payment = order.payments?.[0];
    const isPaid = order.isPaid || payment?.status === "COMPLETED";

    const paymentGateway = await prisma.tenantPaymentGatewayConfig.findUnique({
      where: { tenantId: order.tenantId },
    });
    const upiVpa =
      (paymentGateway?.provider === "DIRECT_UPI" ? paymentGateway.keyId : null) ||
      (paymentGateway?.keyId && paymentGateway.keyId.includes("@") ? paymentGateway.keyId : null) ||
      process.env.RESTAURANT_UPI_VPA ||
      "ajaydpi2005@ptyes";
    const merchantName =
      paymentGateway?.merchantName || setting?.receiptHeader || order.tenant.name || "WAFFLE PLUM HOUSE";
    const upiQrString =
      `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(
        merchantName
      )}&am=${(order.totalPaise / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Bill for ${invoiceNumber}`)}`;

    const qrData =
      printer.qrEnabled && setting?.qrFooterEnabled !== false
        ? (!isPaid
            ? upiQrString
            : (order.invoice?.fileUrl ||
               buildSignedInvoicePdfUrl(order.tenantId, invoiceNumber, options?.baseUrl)))
        : null;

    if (existingJob) {
      const parsed = existingJob.contentJson ? JSON.parse(existingJob.contentJson) : {};
      return {
        jobId: existingJob.id,
        status: existingJob.status as PrintStatus,
        paperWidth: (existingJob.paperWidth === "58mm" ? "58mm" : "80mm"),
        printerId: existingJob.printerId,
        printerName: printer.name,
        printerType: printer.type,
        requiresClientDispatch: existingJob.status === "QUEUED",
        escPosBase64: parsed.escPosBase64,
        textLines: parsed.textLines,
        qrData: parsed.qrData || qrData,
        error: existingJob.lastError || undefined,
      };
    }

    const receiptInput: ThermalReceiptInput = {
      restaurantName: setting?.receiptHeader || order.tenant.name,
      logoUrl: setting?.logoUrl || order.tenant.logoUrl || null,
      outletName: order.outlet.name,
      outletAddress: order.outlet.address,
      outletCity: order.outlet.city,
      outletPhone: order.outlet.phone,
      gstin: setting?.gstNumber || null,
      fssai: setting?.fssaiNumber || null,
      invoiceNumber,
      orderNumber: order.orderNumber,
      dateStr: orderDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      timeStr: orderDate.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      orderType: order.type,
      tableName: order.table?.number || null,
      customerName: order.customerName || "Walk-in Guest",
      customerPhone: order.customerPhone || null,
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
      qrData,
      footerText: setting?.receiptFooter || "Thank you for choosing us!",
    };

    const formatted = formatThermalReceipt(receiptInput, paperWidth);
    const contentPayload = {
      invoiceNumber,
      orderNumber: order.orderNumber,
      paperWidth,
      printerType: printer.type,
      qrData,
      textLines: formatted.textLines,
      escPosBase64: formatted.escPosBase64,
    };

    let job;
    try {
      job = await prisma.printJob.create({
        data: {
          tenantId: order.tenantId,
          outletId: order.outletId,
          printerId: printer.id,
          orderId: order.id,
          idempotencyKey,
          jobType: "BILL",
          paperWidth,
          contentJson: JSON.stringify(contentPayload),
          status: "QUEUED",
        },
      });
    } catch (createErr: any) {
      if (createErr?.code === "P2002") {
        const raceJob = await prisma.printJob.findUnique({
          where: {
            tenantId_idempotencyKey: { tenantId: order.tenantId, idempotencyKey },
          },
        });
        if (raceJob) {
          return {
            jobId: raceJob.id,
            status: raceJob.status as PrintStatus,
            paperWidth,
            printerId: raceJob.printerId,
            printerName: printer.name,
            printerType: printer.type,
            requiresClientDispatch: raceJob.status === "QUEUED",
            escPosBase64: formatted.escPosBase64,
            textLines: formatted.textLines,
            qrData,
          };
        }
      }
      throw createErr;
    }

    const dispatched = await dispatchPrintJob(job.id, options?.transport);

    return {
      jobId: job.id,
      status: dispatched.status,
      paperWidth,
      printerId: printer.id,
      printerName: printer.name,
      printerType: printer.type,
      requiresClientDispatch: dispatched.requiresClientDispatch,
      escPosBase64: formatted.escPosBase64,
      textLines: formatted.textLines,
      qrData,
      error: dispatched.error,
    };
  } catch (err: any) {
    console.error("[ThermalPrint] queueAndDispatchBillPrintJob error:", err);
    return {
      jobId: null,
      status: "FAILED",
      paperWidth: "80mm",
      printerId: null,
      printerName: null,
      printerType: null,
      requiresClientDispatch: false,
      error: err.message || "Print queue error",
    };
  }
}

export async function dispatchPrintJob(
  jobId: string,
  transportOverride?: PrintTransportOverride
): Promise<{
  status: PrintStatus;
  requiresClientDispatch: boolean;
  error?: string;
}> {
  const job = await prisma.printJob.findUnique({
    where: { id: jobId },
    include: { printer: true },
  });

  if (!job) return { status: "FAILED", requiresClientDispatch: false, error: "Print job not found" };
  if (job.status === "PRINTED") {
    return { status: "PRINTED", requiresClientDispatch: false };
  }

  const printer = job.printer;
  if (!printer) {
    await prisma.printJob.update({
      where: { id: job.id },
      data: { status: "NOT_CONFIGURED", lastError: "Printer no longer exists" },
    });
    if (job.orderId) {
      await prisma.order
        .update({ where: { id: job.orderId }, data: { printStatus: "NOT_CONFIGURED" } })
        .catch(() => {});
    }
    return { status: "NOT_CONFIGURED", requiresClientDispatch: false, error: "No printer attached" };
  }

  await prisma.printJob.update({
    where: { id: job.id },
    data: { status: "PRINTING", attempts: { increment: 1 }, dispatchedAt: new Date() },
  });

  const parsed = job.contentJson ? JSON.parse(job.contentJson) : {};
  const escPosBase64: string = parsed.escPosBase64 || "";
  const textLines: string[] = Array.isArray(parsed.textLines) ? parsed.textLines : [];

  let finalStatus: PrintStatus = "QUEUED";
  let requiresClientDispatch = false;
  let errorMsg: string | undefined;

  if (transportOverride) {
    const overrideRes = await transportOverride({
      printer,
      escPosBase64,
      textLines,
    });
    finalStatus = overrideRes.status;
    errorMsg = overrideRes.error;
  } else if (printer.type === "NETWORK_LAN") {
    if (printer.bridgeUrl && !isPrivateIpAddress(new URL(printer.bridgeUrl).hostname)) {
      const br = await sendToLocalBridge(printer.bridgeUrl, {
        jobId: job.id,
        printerName: printer.name,
        paperWidth: job.paperWidth,
        escPosBase64,
        textLines,
      });
      finalStatus = br.status;
      errorMsg = br.error;
    } else if (printer.connectionString) {
      const host = printer.connectionString.split(":")[0]?.trim() || "";
      const isCloudVercel = Boolean(process.env.VERCEL);
      if (isCloudVercel && isPrivateIpAddress(host)) {
        // From Vercel cloud, private LAN printers must be polled by POS browser / local bridge agent
        finalStatus = "QUEUED";
        requiresClientDispatch = true;
      } else {
        const tcp = await sendRawEscPosTcp(
          printer.connectionString,
          Buffer.from(escPosBase64, "base64"),
          1800
        );
        if (tcp.ok) {
          finalStatus = "PRINTED";
        } else {
          finalStatus = "OFFLINE";
          errorMsg = tcp.error;
        }
      }
    } else {
      finalStatus = "OFFLINE";
      errorMsg = "Printer LAN IP:Port is not configured";
    }
  } else if (printer.type === "LOCAL_BRIDGE") {
    if (printer.bridgeUrl) {
      let host = "";
      try {
        host = new URL(printer.bridgeUrl).hostname;
      } catch {}
      if (Boolean(process.env.VERCEL) && (!host || isPrivateIpAddress(host))) {
        finalStatus = "QUEUED";
        requiresClientDispatch = true;
      } else {
        const br = await sendToLocalBridge(printer.bridgeUrl, {
          jobId: job.id,
          printerName: printer.name,
          paperWidth: job.paperWidth,
          escPosBase64,
          textLines,
        });
        finalStatus = br.status;
        errorMsg = br.error;
      }
    } else {
      finalStatus = "QUEUED";
      requiresClientDispatch = true;
    }
  } else {
    // USB_THERMAL, BLUETOOTH_THERMAL, OS_PRINT_SERVICE require browser / local terminal execution
    finalStatus = "QUEUED";
    requiresClientDispatch = true;
  }

  const now = new Date();
  const nextAttempts = job.attempts + 1;
  const nextRetryAt =
    (finalStatus === "OFFLINE" || finalStatus === "FAILED") && nextAttempts < job.maxRetries
      ? new Date(Date.now() + 60_000 * Math.pow(2, job.attempts))
      : null;

  await prisma.printJob.update({
    where: { id: job.id },
    data: {
      status: finalStatus,
      lastError: errorMsg || null,
      printedAt: finalStatus === "PRINTED" ? now : undefined,
      nextRetryAt,
    },
  });

  if (finalStatus === "PRINTED" || finalStatus === "OFFLINE") {
    await prisma.printerDevice
      .update({
        where: { id: printer.id },
        data: {
          status: finalStatus === "PRINTED" ? "CONNECTED" : "OFFLINE",
          lastActiveAt: finalStatus === "PRINTED" ? now : undefined,
        },
      })
      .catch(() => {});
  }

  if (job.orderId) {
    await prisma.order
      .update({
        where: { id: job.orderId },
        data: { printStatus: finalStatus },
      })
      .catch(() => {});
  }

  return {
    status: finalStatus,
    requiresClientDispatch,
    error: errorMsg,
  };
}

