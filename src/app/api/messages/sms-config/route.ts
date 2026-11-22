import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSmsProvider } from "@/lib/messaging/sms-providers";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await getSession();
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const membership = await prisma.membership.findFirst({
      where: { userId },
      select: { tenantId: true },
    });
    if (!membership) return NextResponse.json({ error: "No active membership" }, { status: 403 });

    const configRow = await prisma.integrationConfig.findUnique({
      where: {
        tenantId_provider: {
          tenantId: membership.tenantId,
          provider: "SMS",
        },
      },
    });

    let config = {
      provider: "MOCK",
      apiKey: "",
      senderId: "RSTRNX",
      templateId: "",
      accountSid: "",
      authToken: "",
      fromNumber: "",
      status: "NOT_CONNECTED",
    };

    if (configRow?.configJson) {
      try {
        const parsed = JSON.parse(configRow.configJson);
        config = {
          provider: parsed.provider || "FAST2SMS",
          apiKey: parsed.apiKey ? `****${parsed.apiKey.slice(-4)}` : "",
          senderId: parsed.senderId || "RSTRNX",
          templateId: parsed.templateId || "",
          accountSid: parsed.accountSid ? `****${parsed.accountSid.slice(-4)}` : "",
          authToken: parsed.authToken ? "********" : "",
          fromNumber: parsed.fromNumber || "",
          status: configRow.status || "CONNECTED",
        };
      } catch {}
    }

    return NextResponse.json({ config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getSession();
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const membership = await prisma.membership.findFirst({
      where: { userId },
      select: { tenantId: true, role: true },
    });
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json({ error: "Forbidden: Owner or Admin required" }, { status: 403 });
    }

    const body = await req.json();
    const { provider, apiKey, senderId, templateId, accountSid, authToken, fromNumber, testPhone } = body;

    // Test send if requested
    if (testPhone) {
      const cleanPhone = testPhone.trim();
      const testProvider = getSmsProvider(provider || "MOCK");
      const testResult = await testProvider.send(
        {
          recipientPhone: cleanPhone,
          messageText: `[RestroNex Test] Official SMS gateway verification test message.`,
          senderId: senderId || "RSTRNX",
          dltTemplateId: templateId,
        },
        {
          provider: provider || "MOCK",
          apiKey,
          senderId,
          templateId,
          accountSid,
          authToken,
          fromNumber,
        }
      );

      if (!testResult.ok) {
        return NextResponse.json(
          { error: `Test SMS delivery failed: ${testResult.error || "Unknown provider error"}` },
          { status: 400 }
        );
      }

      return NextResponse.json({ ok: true, message: "Test SMS sent successfully!" });
    }

    // Persist SMS config
    const configPayload = {
      provider: provider || "FAST2SMS",
      apiKey: apiKey?.startsWith("****") ? undefined : apiKey,
      senderId: senderId || "RSTRNX",
      templateId,
      accountSid: accountSid?.startsWith("****") ? undefined : accountSid,
      authToken: authToken === "********" ? undefined : authToken,
      fromNumber,
    };

    // If key not changed, preserve existing
    const existing = await prisma.integrationConfig.findUnique({
      where: {
        tenantId_provider: {
          tenantId: membership.tenantId,
          provider: "SMS",
        },
      },
    });

    if (existing?.configJson) {
      try {
        const old = JSON.parse(existing.configJson);
        if (!configPayload.apiKey) configPayload.apiKey = old.apiKey;
        if (!configPayload.accountSid) configPayload.accountSid = old.accountSid;
        if (!configPayload.authToken) configPayload.authToken = old.authToken;
      } catch {}
    }

    await prisma.integrationConfig.upsert({
      where: {
        tenantId_provider: {
          tenantId: membership.tenantId,
          provider: "SMS",
        },
      },
      update: {
        status: "CONNECTED",
        configJson: JSON.stringify(configPayload),
        lastSyncAt: new Date(),
      },
      create: {
        tenantId: membership.tenantId,
        provider: "SMS",
        status: "CONNECTED",
        configJson: JSON.stringify(configPayload),
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, message: "SMS configuration saved successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
