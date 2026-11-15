import crypto from "crypto";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/encryption";

export interface PhonePeConfig {
  merchantId: string;
  saltKey: string;
  saltIndex: string;
  hostUrl: string;
  isUat: boolean;
}

// Default standard PhonePe credentials (Sandbox / Production)
const DEFAULT_UAT_MID = "PGTESTPAYUAT86";
const DEFAULT_UAT_SALT_KEY = "96434309-7796-489d-8924-ab56988a6076";
const DEFAULT_UAT_SALT_INDEX = "1";
const UAT_HOST = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const PROD_HOST = "https://api.phonepe.com/apis/hermes";

/**
 * Resolves PhonePe credentials for a given restaurant tenant.
 * Uses custom merchant credentials if configured, otherwise falls back to active gateway.
 */
export async function getPhonePeConfig(tenantId: string): Promise<PhonePeConfig> {
  const config = await prisma.tenantPaymentGatewayConfig.findUnique({
    where: { tenantId },
  });

  const envMid = process.env.PHONEPE_MERCHANT_ID;
  const envSaltKey = process.env.PHONEPE_SALT_KEY;
  const envSaltIndex = process.env.PHONEPE_SALT_INDEX || "1";

  // Case 1: Custom PhonePe credentials configured in DB
  if (config && config.provider === "PHONEPE" && config.isEnabled && config.keyId) {
    const saltKey = decryptSecret(config.keySecretEncrypted) || DEFAULT_UAT_SALT_KEY;
    const saltIndex = decryptSecret(config.webhookSecretEncrypted) || "1";
    const isUat = config.keyId.startsWith("PGTEST");
    return {
      merchantId: config.keyId,
      saltKey,
      saltIndex,
      hostUrl: isUat ? UAT_HOST : PROD_HOST,
      isUat,
    };
  }

  // Case 2: Environment variables
  if (envMid && envSaltKey) {
    const isUat = envMid.startsWith("PGTEST");
    return {
      merchantId: envMid,
      saltKey: envSaltKey,
      saltIndex: envSaltIndex,
      hostUrl: isUat ? UAT_HOST : PROD_HOST,
      isUat,
    };
  }

  // Case 3: Standard PhonePe UAT Gateway
  return {
    merchantId: DEFAULT_UAT_MID,
    saltKey: DEFAULT_UAT_SALT_KEY,
    saltIndex: DEFAULT_UAT_SALT_INDEX,
    hostUrl: UAT_HOST,
    isUat: true,
  };
}

/**
 * Initiates an official PhonePe Payment Request (Pay Page with UPI Intent & Cards)
 */
export async function initiatePhonePePayment(opts: {
  tenantId: string;
  orderId: string;
  orderNumber: string;
  amountPaise: number;
  customerPhone?: string | null;
  customerName?: string | null;
  redirectUrl: string;
  callbackUrl: string;
}) {
  const config = await getPhonePeConfig(opts.tenantId);

  const cleanOrderNum = opts.orderNumber.replace(/[^a-zA-Z0-9]/g, "").slice(-12);
  const merchantTransactionId = `MT${cleanOrderNum}${Date.now().toString(36).slice(-6)}`;
  const merchantUserId = `MUID_${(opts.customerPhone || "GUEST").replace(/\D/g, "").slice(-10)}_${Date.now().toString(36).slice(-4)}`;

  const payload = {
    merchantId: config.merchantId,
    merchantTransactionId,
    merchantUserId,
    amount: opts.amountPaise,
    redirectUrl: opts.redirectUrl,
    redirectMode: "REDIRECT",
    callbackUrl: opts.callbackUrl,
    mobileNumber: (opts.customerPhone || "9513008467").replace(/\D/g, "").slice(-10),
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  const base64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const stringToHash = `${base64}/pg/v1/pay${config.saltKey}`;
  const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
  const checksum = `${sha256}###${config.saltIndex}`;

  const res = await fetch(`${config.hostUrl}/pg/v1/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": checksum,
    },
    body: JSON.stringify({ request: base64 }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Failed to initiate payment on PhonePe gateway");
  }

  const redirectUrl = data.data?.instrumentResponse?.redirectInfo?.url;
  if (!redirectUrl) {
    throw new Error("PhonePe did not return a valid payment redirect URL");
  }

  return {
    ok: true,
    merchantTransactionId,
    redirectUrl,
    merchantId: config.merchantId,
  };
}

/**
 * Checks payment status directly with PhonePe Gateway Server
 */
export async function checkPhonePeStatus(opts: {
  tenantId: string;
  merchantTransactionId: string;
}) {
  const config = await getPhonePeConfig(opts.tenantId);

  const endpoint = `/pg/v1/status/${config.merchantId}/${opts.merchantTransactionId}`;
  const stringToHash = `${endpoint}${config.saltKey}`;
  const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
  const checksum = `${sha256}###${config.saltIndex}`;

  const res = await fetch(`${config.hostUrl}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": checksum,
      "X-MERCHANT-ID": config.merchantId,
    },
    cache: "no-store",
  });

  const data = await res.json();

  const isSuccess = data.success === true && data.code === "PAYMENT_SUCCESS";
  const isPending = data.code === "PAYMENT_PENDING";

  return {
    isPaid: isSuccess,
    isPending,
    code: data.code,
    message: data.message,
    amountPaise: data.data?.amount || 0,
    transactionId: data.data?.transactionId || null,
    utr: data.data?.paymentInstrument?.utr || null,
    paymentInstrument: data.data?.paymentInstrument || null,
  };
}

/**
 * Verifies PhonePe Server Webhook Signature
 */
export function verifyPhonePeWebhook(opts: {
  base64Response: string;
  xVerifyHeader: string;
  saltKey: string;
  saltIndex: string;
}): boolean {
  try {
    const stringToHash = `${opts.base64Response}${opts.saltKey}`;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const expectedChecksum = `${sha256}###${opts.saltIndex}`;
    return crypto.timingSafeEqual(
      Buffer.from(opts.xVerifyHeader),
      Buffer.from(expectedChecksum)
    );
  } catch {
    return false;
  }
}
