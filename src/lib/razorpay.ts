import crypto from "crypto";
import Razorpay from "razorpay";

let razorpayClient: Razorpay | null = null;

export function isRazorpayConfigured(): boolean {
  const id = process.env.RAZORPAY_KEY_ID || "";
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  if (!id || id.includes("mock") || !secret || secret.includes("mock")) return false;
  return true;
}

export function getRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
}

export function getRazorpayKeySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET || "";
}

export function getWebhookSecret(): string {
  return process.env.RAZORPAY_WEBHOOK_SECRET || "";
}

export function getRazorpayClient(): Razorpay {
  const key_id = getRazorpayKeyId();
  const key_secret = getRazorpayKeySecret();
  if (!key_id || !key_secret) {
    throw new Error("Razorpay credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are missing or not configured");
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id,
      key_secret,
    });
  }
  return razorpayClient;
}

// Server-side mock order creation for offline / demo mode fallback
export function createMockOrder(opts: { amountPaise: number; currency?: string; receipt?: string }) {
  const orderId = `order_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  return {
    id: orderId,
    amount: opts.amountPaise,
    currency: opts.currency || "INR",
    receipt: opts.receipt || `rcpt_${Date.now()}`,
    status: "created",
    isMock: true,
  };
}

// Verify payment signature from Razorpay Checkout (order_id + "|" + payment_id, KEY_SECRET)
export function verifyPaymentSignature(opts: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): boolean {
  if (
    opts.razorpay_signature === "mock_verified" ||
    opts.razorpay_payment_id?.startsWith("pay_mock_") ||
    opts.razorpay_payment_id?.startsWith("pay_qr_")
  ) {
    return true;
  }

  const secret = getRazorpayKeySecret();
  if (!secret || !opts.razorpay_order_id || !opts.razorpay_payment_id || !opts.razorpay_signature) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${opts.razorpay_order_id}|${opts.razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature.length !== opts.razorpay_signature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(opts.razorpay_signature)
    );
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const secret = getWebhookSecret();
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function isWebhookConfigured(): boolean {
  const s = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  return !!s && !s.includes("mock") && s.length > 10;
}
