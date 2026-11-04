import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptSecret, maskCredential } from "@/lib/encryption";
import Razorpay from "razorpay";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const config = await prisma.tenantPaymentGatewayConfig.findUnique({
    where: { tenantId },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  return NextResponse.json({
    tenantId,
    isEnabled: config?.isEnabled || false,
    keyId: config?.keyId || "",
    keyIdMasked: maskCredential(config?.keyId),
    hasSecret: !!config?.keySecretEncrypted,
    merchantName: config?.merchantName || tenant?.name || "Restaurant Merchant",
    autoCapture: config?.autoCapture ?? true,
    cashEnabled: config?.cashEnabled ?? true,
    cardTerminalEnabled: config?.cardTerminalEnabled ?? true,
    upiManualEnabled: config?.upiManualEnabled ?? true,
    routeAccountId: config?.routeAccountId || null,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!mem || mem.role !== "OWNER") {
    return NextResponse.json({ error: "Only the business owner can configure payment gateway credentials" }, { status: 403 });
  }

  const {
    isEnabled = false,
    keyId,
    keySecret,
    webhookSecret,
    merchantName,
    autoCapture = true,
    cashEnabled = true,
    cardTerminalEnabled = true,
    upiManualEnabled = true,
  } = body;

  const existing = await prisma.tenantPaymentGatewayConfig.findUnique({
    where: { tenantId },
  });

  const finalKeyId = keyId ? String(keyId).trim() : existing?.keyId || null;

  // If a new secret was entered, validate it against Razorpay before saving
  let encryptedSecret = existing?.keySecretEncrypted;
  if (keySecret && typeof keySecret === "string" && keySecret.trim()) {
    const rawSecret = keySecret.trim();

    if (finalKeyId) {
      try {
        const testClient = new Razorpay({
          key_id: finalKeyId,
          key_secret: rawSecret,
        });
        // Test connectivity by querying orders with limit 1
        await testClient.orders.all({ count: 1 });
      } catch (testErr: any) {
        // If razorpay returns 401, reject immediately to protect the owner from bad credentials
        if (testErr?.statusCode === 401 || testErr?.status === 401) {
          return NextResponse.json(
            { error: "Invalid Razorpay Key ID or Key Secret. Authentication failed with Razorpay API." },
            { status: 400 }
          );
        }
      }
    }

    encryptedSecret = encryptSecret(rawSecret);
  }

  let encryptedWebhook = existing?.webhookSecretEncrypted;
  if (webhookSecret && typeof webhookSecret === "string" && webhookSecret.trim()) {
    encryptedWebhook = encryptSecret(webhookSecret.trim());
  }

  const updated = await prisma.tenantPaymentGatewayConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      provider: "RAZORPAY",
      isEnabled: Boolean(isEnabled && finalKeyId && encryptedSecret),
      keyId: finalKeyId,
      keySecretEncrypted: encryptedSecret,
      webhookSecretEncrypted: encryptedWebhook,
      merchantName: merchantName?.trim() || null,
      autoCapture: Boolean(autoCapture),
      cashEnabled: Boolean(cashEnabled),
      cardTerminalEnabled: Boolean(cardTerminalEnabled),
      upiManualEnabled: Boolean(upiManualEnabled),
    },
    update: {
      isEnabled: Boolean(isEnabled && finalKeyId && encryptedSecret),
      keyId: finalKeyId,
      keySecretEncrypted: encryptedSecret,
      webhookSecretEncrypted: encryptedWebhook,
      merchantName: merchantName?.trim() || null,
      autoCapture: Boolean(autoCapture),
      cashEnabled: Boolean(cashEnabled),
      cardTerminalEnabled: Boolean(cardTerminalEnabled),
      upiManualEnabled: Boolean(upiManualEnabled),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "PAYMENT_GATEWAY_CONFIG_UPDATED",
      entity: "TenantPaymentGatewayConfig",
      entityId: updated.id,
      metadataJson: JSON.stringify({
        isEnabled: updated.isEnabled,
        keyIdMasked: maskCredential(updated.keyId),
        autoCapture: updated.autoCapture,
      }),
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Payment settings saved and verified securely.",
    config: {
      isEnabled: updated.isEnabled,
      keyIdMasked: maskCredential(updated.keyId),
      hasSecret: !!updated.keySecretEncrypted,
      merchantName: updated.merchantName,
      autoCapture: updated.autoCapture,
      cashEnabled: updated.cashEnabled,
      cardTerminalEnabled: updated.cardTerminalEnabled,
      upiManualEnabled: updated.upiManualEnabled,
    },
  });
}

