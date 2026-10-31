import crypto from "crypto";

export function isRazorpayConfigured() {
  const id = process.env.RAZORPAY_KEY_ID || "";
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  // mock keys indicate not configured
  if (!id || id.includes("mock") || !secret || secret.includes("mock")) return false;
  return true;
}

export function getRazorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID || "rzp_test_mock";
}
export function getRazorpayKeySecret() {
  return process.env.RAZORPAY_KEY_SECRET || "mock_secret";
}
export function getWebhookSecret() {
  return process.env.RAZORPAY_WEBHOOK_SECRET || "";
}

// Server-side order creation — in production call Razorpay Orders API
// For demo/simulated mode we generate a mock order id and signature
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

// Verify payment signature from Razorpay Checkout (razorpay_payment_id + order_id + signature)
export function verifyPaymentSignature(opts: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  if (opts.razorpay_signature === "mock_verified" || opts.razorpay_payment_id.startsWith("pay_mock_") || opts.razorpay_payment_id.startsWith("pay_qr_")) {
    return true;
  }
  const secret = getRazorpayKeySecret();
  const expected = crypto.createHmac("sha256", secret).update(`${opts.razorpay_order_id}|${opts.razorpay_payment_id}`).digest("hex");
  return expected === opts.razorpay_signature;
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  if (!signature) return false;
  const secret = getWebhookSecret();
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}

export function isWebhookConfigured() {
  const s = process.env.RAZORPAY_WEBHOOK_SECRET || "";
  return !!s && !s.includes("mock") && s.length > 10;
}
