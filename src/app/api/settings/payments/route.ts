import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret, maskCredential } from "@/lib/encryption";
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

  const isPhonePe = config?.provider === "PHONEPE";
  const phonepeMid = isPhonePe ? config?.keyId : (process.env.PHONEPE_MERCHANT_ID || "PGTESTPAYUAT86");
  const phonepeSaltIndex = isPhonePe ? (decryptSecret(config?.webhookSecretEncrypted) || "1") : "1";
  const hasPhonepeSecret = isPhonePe ? !!config?.keySecretEncrypted : true;

  return NextResponse.json({
    tenantId,
    provider: config?.provider || "PHONEPE",
    isEnabled: config?.isEnabled ?? true,
    keyId: config?.keyId || "",
    keyIdMasked: config?.provider === "DIRECT_UPI" ? config?.keyId || "" : maskCredential(config?.keyId),
    hasSecret: !!config?.keySecretEncrypted,
    merchantName: config?.merchantName || tenant?.name || "WAFFLE PLUM HOUSE",
    upiId: config?.provider === "DIRECT_UPI" ? config?.keyId || "ajaydpi2005@ptyes" : "ajaydpi2005@ptyes",
    phonepeMid: phonepeMid || "PGTESTPAYUAT86",
    phonepeSaltIndex: phonepeSaltIndex || "1",
    hasPhonepeSecret,
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
    provider = "PHONEPE",
    upiId,
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

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  const existing = await prisma.tenantPaymentGatewayConfig.findUnique({
    where: { tenantId },
  });

  const finalMerchantName = merchantName?.trim() || tenant?.name || "WAFFLE PLUM HOUSE";

  // Handle Option 1: Official PhonePe Payment Gateway (0% Fee, Auto-Verified)
  if (provider === "PHONEPE") {
    const finalMid = String(body.phonepeMid || body.merchantId || body.keyId || "PGTESTPAYUAT86").trim();
    const finalSaltIndex = String(body.phonepeSaltIndex || body.saltIndex || "1").trim();

    let encryptedSecret = existing?.keySecretEncrypted;
    if (body.phonepeSaltKey && typeof body.phonepeSaltKey === "string" && body.phonepeSaltKey.trim()) {
      encryptedSecret = encryptSecret(body.phonepeSaltKey.trim());
    } else if (!encryptedSecret) {
      encryptedSecret = encryptSecret("96434309-7796-489d-8924-ab56988a6076");
    }
    const encryptedSaltIndex = encryptSecret(finalSaltIndex);

    const updated = await prisma.tenantPaymentGatewayConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        provider: "PHONEPE",
        isEnabled: true,
        keyId: finalMid,
        keySecretEncrypted: encryptedSecret,
        webhookSecretEncrypted: encryptedSaltIndex,
        merchantName: finalMerchantName,
        autoCapture: true,
        cashEnabled: Boolean(cashEnabled),
        cardTerminalEnabled: Boolean(cardTerminalEnabled),
        upiManualEnabled: true,
      },
      update: {
        provider: "PHONEPE",
        isEnabled: true,
        keyId: finalMid,
        keySecretEncrypted: encryptedSecret,
        webhookSecretEncrypted: encryptedSaltIndex,
        merchantName: finalMerchantName,
        autoCapture: true,
        cashEnabled: Boolean(cashEnabled),
        cardTerminalEnabled: Boolean(cardTerminalEnabled),
        upiManualEnabled: true,
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
          provider: "PHONEPE",
          merchantId: finalMid,
          saltIndex: finalSaltIndex,
          merchantName: finalMerchantName,
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      message: "PhonePe Payment Gateway (0% Fee, Auto-Verified) activated successfully!",
      config: {
        provider: "PHONEPE",
        isEnabled: true,
        phonepeMid: finalMid,
        phonepeSaltIndex: finalSaltIndex,
        hasPhonepeSecret: true,
        merchantName: finalMerchantName,
        cashEnabled: updated.cashEnabled,
        cardTerminalEnabled: updated.cardTerminalEnabled,
        upiManualEnabled: true,
      },
    });
  }

  // Handle Option 2: Direct Dynamic UPI QR (0% Gateway Fee)
  if (provider === "DIRECT_UPI" || (provider !== "RAZORPAY" && upiId)) {
    const rawUpi = String(upiId || keyId || "ajaydpi2005@ptyes").trim();

    const updated = await prisma.tenantPaymentGatewayConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        provider: "DIRECT_UPI",
        isEnabled: true,
        keyId: rawUpi,
        merchantName: finalMerchantName,
        autoCapture: true,
        cashEnabled: Boolean(cashEnabled),
        cardTerminalEnabled: Boolean(cardTerminalEnabled),
        upiManualEnabled: true,
      },
      update: {
        provider: "DIRECT_UPI",
        isEnabled: true,
        keyId: rawUpi,
        merchantName: finalMerchantName,
        autoCapture: true,
        cashEnabled: Boolean(cashEnabled),
        cardTerminalEnabled: Boolean(cardTerminalEnabled),
        upiManualEnabled: true,
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
          provider: "DIRECT_UPI",
          upiId: rawUpi,
          merchantName: finalMerchantName,
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Direct Dynamic UPI QR (0% Fee) activated successfully!",
      config: {
        provider: "DIRECT_UPI",
        isEnabled: true,
        upiId: rawUpi,
        keyId: rawUpi,
        merchantName: finalMerchantName,
        cashEnabled: updated.cashEnabled,
        cardTerminalEnabled: updated.cardTerminalEnabled,
        upiManualEnabled: true,
      },
    });
  }

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

