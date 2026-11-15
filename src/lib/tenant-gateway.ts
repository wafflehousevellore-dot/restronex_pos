import Razorpay from "razorpay";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/encryption";
import { getRazorpayKeyId, getRazorpayKeySecret, isRazorpayConfigured } from "@/lib/razorpay";

export interface ResolvedGateway {
  mode: "DIRECT" | "ROUTE" | "OFFLINE_ONLY";
  keyId: string | null;
  keySecret: string | null;
  merchantName: string;
  autoCapture: boolean;
  cashEnabled: boolean;
  cardTerminalEnabled: boolean;
  upiManualEnabled: boolean;
  client: Razorpay | null;
}

/**
 * Resolves the payment credentials specifically for a given restaurant tenant.
 * Never defaults diner order money to RestroNex SaaS account unless explicit Route is activated.
 */
export async function resolveTenantGateway(tenantId: string): Promise<ResolvedGateway> {
  const config = await prisma.tenantPaymentGatewayConfig.findUnique({
    where: { tenantId },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  const merchantName = config?.merchantName || tenant?.name || "Restaurant";

  // Case 1: Direct Merchant Account configured by the restaurant owner
  if (config && config.isEnabled && config.keyId && config.keySecretEncrypted) {
    const decryptedSecret = decryptSecret(config.keySecretEncrypted);
    if (decryptedSecret) {
      const client = new Razorpay({
        key_id: config.keyId,
        key_secret: decryptedSecret,
      });

      return {
        mode: "DIRECT",
        keyId: config.keyId,
        keySecret: decryptedSecret,
        merchantName,
        autoCapture: config.autoCapture,
        cashEnabled: config.cashEnabled,
        cardTerminalEnabled: config.cardTerminalEnabled,
        upiManualEnabled: config.upiManualEnabled,
        client,
      };
    }
  }

  // Case 2: Razorpay Route linked account (if configured)
  if (config?.routeAccountId && isRazorpayConfigured()) {
    const platformKeyId = getRazorpayKeyId();
    const platformKeySecret = getRazorpayKeySecret();
    const client = new Razorpay({
      key_id: platformKeyId,
      key_secret: platformKeySecret,
    });

    return {
      mode: "ROUTE",
      keyId: platformKeyId,
      keySecret: platformKeySecret,
      merchantName,
      autoCapture: config.autoCapture,
      cashEnabled: config.cashEnabled,
      cardTerminalEnabled: config.cardTerminalEnabled,
      upiManualEnabled: config.upiManualEnabled,
      client,
    };
  }

  // Case 3: Active Razorpay Gateway configured in environment (Default automated verification)
  if (isRazorpayConfigured()) {
    const platformKeyId = getRazorpayKeyId();
    const platformKeySecret = getRazorpayKeySecret();
    const client = new Razorpay({
      key_id: platformKeyId,
      key_secret: platformKeySecret,
    });

    return {
      mode: "DIRECT",
      keyId: platformKeyId,
      keySecret: platformKeySecret,
      merchantName,
      autoCapture: config?.autoCapture ?? true,
      cashEnabled: config ? config.cashEnabled : true,
      cardTerminalEnabled: config ? config.cardTerminalEnabled : true,
      upiManualEnabled: config ? config.upiManualEnabled : true,
      client,
    };
  }

  // Case 4: Offline-only (Cash, External Card Terminal recorded by staff, Manual UPI)
  return {
    mode: "OFFLINE_ONLY",
    keyId: null,
    keySecret: null,
    merchantName,
    autoCapture: false,
    cashEnabled: config ? config.cashEnabled : true,
    cardTerminalEnabled: config ? config.cardTerminalEnabled : true,
    upiManualEnabled: config ? config.upiManualEnabled : true,
    client: null,
  };
}

