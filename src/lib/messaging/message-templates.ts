export interface InvoiceMessageData {
  restaurantName: string;
  invoiceNumber: string;
  totalPaise: number;
  paidPaise: number;
  balanceDuePaise: number;
  paymentMethod: string;
  paymentStatus: "PAID" | "UNPAID" | "PARTIALLY_PAID" | string;
  invoiceUrl: string;
  customerName?: string | null;
}

export function formatINRText(paise: number): string {
  return (paise / 100).toFixed(2);
}

/**
 * Normalizes phone numbers for SMS/WhatsApp dispatch (+91 format).
 */
export function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (rawPhone.startsWith("+")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

/**
 * Derives user-facing payment method summary and status string.
 */
export function resolvePaymentDisplay(params: {
  totalPaise: number;
  payments?: Array<{ method: string; amountPaise: number; status: string }>;
  paymentMethod?: string;
  paymentStatus?: string;
  paidPaise?: number;
  balanceDuePaise?: number;
}): {
  displayMethod: string;
  displayStatus: "PAID" | "UNPAID" | "PARTIALLY_PAID";
  paidPaise: number;
  balanceDuePaise: number;
} {
  const recorded = params.payments || [];
  const completed = recorded.filter(
    (p) => p.status === "COMPLETED" || p.status === "PAID" || p.status === "CAPTURED"
  );

  let paidPaise = 0;
  if (completed.length > 0) {
    paidPaise = completed.reduce((sum, p) => sum + p.amountPaise, 0);
  } else if (params.paidPaise !== undefined) {
    paidPaise = params.paidPaise;
  } else if (params.paymentStatus === "PAID") {
    paidPaise = params.totalPaise;
  }

  const balanceDuePaise =
    params.balanceDuePaise !== undefined
      ? params.balanceDuePaise
      : Math.max(0, params.totalPaise - paidPaise);

  if (paidPaise === 0 || (params.paymentStatus === "UNPAID" && paidPaise === 0)) {
    return {
      displayMethod: "UNPAID",
      displayStatus: "UNPAID",
      paidPaise: 0,
      balanceDuePaise: params.totalPaise,
    };
  }

  if (balanceDuePaise > 0) {
    return {
      displayMethod: "PARTIAL",
      displayStatus: "PARTIALLY_PAID",
      paidPaise,
      balanceDuePaise,
    };
  }

  // Fully paid
  if (completed.length > 1) {
    const distinctMethods = Array.from(new Set(completed.map((p) => p.method.toUpperCase())));
    return {
      displayMethod: distinctMethods.join(" + "),
      displayStatus: "PAID",
      paidPaise,
      balanceDuePaise: 0,
    };
  }

  const singleMethod =
    completed.length === 1
      ? completed[0].method.toUpperCase()
      : (params.paymentMethod || "CASH").toUpperCase();

  return {
    displayMethod: singleMethod,
    displayStatus: "PAID",
    paidPaise,
    balanceDuePaise: 0,
  };
}

/**
 * Builds the official customer WhatsApp invoice message.
 */
export function buildWhatsAppMessage(data: InvoiceMessageData): string {
  const formattedAmount = formatINRText(data.totalPaise);
  const statusLabel =
    data.paymentStatus === "PAID"
      ? "PAID"
      : data.paymentStatus === "PARTIALLY_PAID"
      ? "PARTIALLY PAID"
      : "UNPAID";

  return [
    `Thank you for visiting *${data.restaurantName}*! ❤️`,
    ``,
    `Here is your invoice for your recent order:`,
    `🧾 *Invoice No:* ${data.invoiceNumber}`,
    `💰 *Total Amount:* ₹${formattedAmount}`,
    `💳 *Payment:* ${data.paymentMethod} (${statusLabel})`,
    ``,
    `View or download your complete digital tax invoice here:`,
    `🔗 ${data.invoiceUrl}`,
    ``,
    `We look forward to serving you again soon!`,
  ].join("\n");
}

/**
 * Builds the official customer SMS invoice message respecting telecom limits.
 */
export function buildSmsMessage(data: InvoiceMessageData): string {
  const formattedAmount = formatINRText(data.totalPaise);
  const statusLabel =
    data.paymentStatus === "PAID"
      ? "PAID"
      : data.paymentStatus === "PARTIALLY_PAID"
      ? "PARTIALLY PAID"
      : "UNPAID";

  return `Thanks for visiting ${data.restaurantName}! Bill #${data.invoiceNumber} for Rs.${formattedAmount} (${data.paymentMethod} - ${statusLabel}). View bill: ${data.invoiceUrl}`;
}
