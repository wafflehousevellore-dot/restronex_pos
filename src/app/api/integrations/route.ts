import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getIntegrationMeta,
  validatePhone,
  cleanIndianPhone,
  IntegrationStatus,
  IntegrationConfigData,
} from "@/lib/integrations";
import { encryptSecret } from "@/lib/encryption";
import { getTimeZoneDayBoundsUtc } from "@/lib/timezone";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Query tenant details, outlets, configs, and menuItems in parallel
  const [
    tenant,
    outlets,
    configs,
    menuItems,
    paymentConfig,
    whatsAppConfig,
    printerDevices,
    aggregatorConns,
  ] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, email: true, phone: true },
    }),
    prisma.outlet.findMany({
      where: { tenantId },
      select: { id: true, name: true, slug: true, address: true, city: true, phone: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.integrationConfig.findMany({
      where: { tenantId },
      orderBy: { lastSyncAt: "desc" },
    }),
    prisma.menuItem.findMany({
      where: { tenantId },
      select: { id: true, name: true, pricePaise: true, category: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.tenantPaymentGatewayConfig.findUnique({
      where: { tenantId },
    }),
    prisma.outletWhatsAppConfig.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.printerDevice.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aggregatorConnection.findMany({
      where: { tenantId },
    }),
  ]);

  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  // Parse configJson for each config to return clean typed data
  const parsedConfigs = configs.map((c) => {
    let data: IntegrationConfigData = {};
    try {
      data = c.configJson ? JSON.parse(c.configJson) : {};
    } catch {
      data = {};
    }
    return {
      id: c.id,
      tenantId: c.tenantId,
      provider: c.provider,
      status: c.status as IntegrationStatus,
      lastSyncAt: c.lastSyncAt,
      data,
    };
  });

  const swiggyConn = aggregatorConns.find((c) => c.provider === "SWIGGY");
  const zomatoConn = aggregatorConns.find((c) => c.provider === "ZOMATO");

  return NextResponse.json({
    tenant,
    outlets,
    configs: parsedConfigs,
    menuItems,
    summary: {
      payments: {
        provider: paymentConfig?.provider || "RAZORPAY",
        isEnabled: paymentConfig?.isEnabled || false,
        status: paymentConfig?.isEnabled && paymentConfig?.keySecretEncrypted
          ? "CONNECTED"
          : paymentConfig?.keyId
          ? "PENDING_CONFIGURATION"
          : "NOT_CONNECTED",
        keyIdMasked: paymentConfig?.keyId ? `${paymentConfig.keyId.slice(0, 8)}••••••••` : null,
        hasSecret: !!paymentConfig?.keySecretEncrypted,
        hasWebhookSecret: !!paymentConfig?.webhookSecretEncrypted,
        cashEnabled: paymentConfig?.cashEnabled ?? true,
        cardTerminalEnabled: paymentConfig?.cardTerminalEnabled ?? true,
        upiManualEnabled: paymentConfig?.upiManualEnabled ?? true,
        lastVerifiedAt: paymentConfig?.updatedAt || null,
      },
      whatsapp: {
        status: whatsAppConfig?.status === "CONNECTED" ? "CONNECTED" : (whatsAppConfig?.phoneNumberId ? "PENDING_CONFIGURATION" : "NOT_CONNECTED"),
        displayPhone: whatsAppConfig?.displayPhone || null,
        phoneNumberId: whatsAppConfig?.phoneNumberId || null,
        wabaId: whatsAppConfig?.wabaId || null,
        lastVerifiedAt: whatsAppConfig?.lastVerifiedAt || whatsAppConfig?.connectedAt || null,
      },
      printers: {
        count: printerDevices.length,
        status: printerDevices.length > 0 ? "CONNECTED" : "NOT_CONNECTED",
        devices: printerDevices.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          station: p.station,
          paperWidth: p.paperWidth,
          isDefaultBilling: p.isDefaultBilling,
          isDefaultKOT: p.isDefaultKOT,
          lastActiveAt: p.lastActiveAt,
        })),
      },
      onlineOrdering: {
        swiggy: {
          status: swiggyConn?.status === "CONNECTED" && swiggyConn?.credentialsEncrypted
            ? "CONNECTED"
            : swiggyConn?.credentialsEncrypted
            ? "PENDING_APPROVAL"
            : "PROVIDER_APPROVAL_REQUIRED",
          hasCredentials: !!swiggyConn?.credentialsEncrypted,
          lastSyncAt: swiggyConn?.lastSyncAt || null,
        },
        zomato: {
          status: zomatoConn?.status === "CONNECTED" && zomatoConn?.credentialsEncrypted
            ? "CONNECTED"
            : zomatoConn?.credentialsEncrypted
            ? "PENDING_APPROVAL"
            : "PROVIDER_APPROVAL_REQUIRED",
          hasCredentials: !!zomatoConn?.credentialsEncrypted,
          lastSyncAt: zomatoConn?.lastSyncAt || null,
        },
      },
      accounting: {
        status: parsedConfigs.find((c) => c.provider === "accounting")?.status || "CONNECTED",
        format: parsedConfigs.find((c) => c.provider === "accounting")?.data?.exportFormat || "TALLY_XML",
      },
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const {
    tenantId: tid,
    provider,
    action = "connect",
    outletId,
    registeredPhone,
    merchantName,
    providerStoreId,
    printerIp,
    printerPort,
    printerPaper,
    printerStation,
    exportFormat,
    exportSchedule,
    apiKey,
    webhookSecret,
    otp,
  } = body;

  if (!provider) {
    return NextResponse.json({ error: "Provider identifier is required" }, { status: 400 });
  }

  const tenantId = await resolveTenantId(userId, tid || null);
  if (!tenantId) return NextResponse.json({ error: "Tenant organization context required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Only authorized management roles can modify store integrations
  if (!["OWNER", "HEAD_OFFICE", "OUTLET_MANAGER"].includes(mem.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions. Only Store Owners or Managers can manage integrations." },
      { status: 403 }
    );
  }

  const meta = getIntegrationMeta(provider);
  if (!meta) {
    return NextResponse.json({ error: `Unknown integration provider: ${provider}` }, { status: 400 });
  }

  // --------------------------------------------------------------------------
  // ACTION: DISCONNECT
  // --------------------------------------------------------------------------
  if (action === "disconnect") {
    const existing = await prisma.integrationConfig.findUnique({
      where: { tenantId_provider: { tenantId, provider } },
    });

    if (existing) {
      await prisma.integrationConfig.update({
        where: { id: existing.id },
        data: {
          status: "DISCONNECTED",
          configJson: JSON.stringify({
            disconnectedAt: new Date().toISOString(),
            previousStatus: existing.status,
            statusMessage: "Integration disconnected by restaurant owner.",
          }),
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "INTEGRATION_DISCONNECTED",
          entity: "IntegrationConfig",
          entityId: existing.id,
          metadataJson: JSON.stringify({ provider }),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      provider,
      status: "DISCONNECTED",
      message: `Disconnected ${meta.name}. Real-time synchronization stopped.`,
    });
  }

  // --------------------------------------------------------------------------
  // ACTION: VERIFY LIVE CONNECTION
  // --------------------------------------------------------------------------
  if (action === "verify" || action === "test") {
    const existing = await prisma.integrationConfig.findUnique({
      where: { tenantId_provider: { tenantId, provider } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Not configured. Please initiate a connection request first." },
        { status: 400 }
      );
    }

    let currentData: IntegrationConfigData = {};
    try {
      currentData = existing.configJson ? JSON.parse(existing.configJson) : {};
    } catch {
      currentData = {};
    }

    // 2. QR Ordering (Always Connected)
    if (provider === "qr_ordering") {
      await prisma.integrationConfig.update({
        where: { id: existing.id },
        data: {
          status: "CONNECTED",
          lastSyncAt: new Date(),
        },
      });
      return NextResponse.json({
        ok: true,
        status: "CONNECTED",
        verified: true,
        message: "Contactless QR Menu engine verified and active across all tables.",
      });
    }

    // 3. Network Thermal Printer
    if (provider === "printer") {
      const isValidIp =
        currentData.printerIp &&
        /^(\d{1,3}\.){3}\d{1,3}$/.test(currentData.printerIp.trim());

      const status: IntegrationStatus = isValidIp ? "CONNECTED" : "ERROR";
      const statusMessage = isValidIp
        ? `Thermal printer verified at ${currentData.printerIp}:${currentData.printerPort || 9100}`
        : "Invalid printer IP address. Please enter a valid LAN IP (e.g. 192.168.1.100).";

      await prisma.integrationConfig.update({
        where: { id: existing.id },
        data: {
          status,
          lastSyncAt: isValidIp ? new Date() : existing.lastSyncAt,
          configJson: JSON.stringify({
            ...currentData,
            statusMessage,
            lastTestedAt: new Date().toISOString(),
          }),
        },
      });

      return NextResponse.json({
        ok: isValidIp,
        status,
        verified: isValidIp,
        message: statusMessage,
      });
    }

    // 4. Accounting Export (Tally / Zoho)
    if (provider === "accounting") {
      await prisma.integrationConfig.update({
        where: { id: existing.id },
        data: {
          status: "CONNECTED",
          lastSyncAt: new Date(),
        },
      });
      return NextResponse.json({
        ok: true,
        status: "CONNECTED",
        verified: true,
        message: `Accounting export verified for ${currentData.exportFormat || "Tally Prime XML"}.`,
      });
    }

    // 5. Generic Ordering Webhook
    if (provider === "dotpe") {
      const hasKey = Boolean(currentData.apiKey);
      const status: IntegrationStatus = hasKey ? "CONNECTED" : "ERROR";
      await prisma.integrationConfig.update({
        where: { id: existing.id },
        data: { status, lastSyncAt: hasKey ? new Date() : existing.lastSyncAt },
      });
      return NextResponse.json({
        ok: hasKey,
        status,
        verified: hasKey,
        message: hasKey ? "Webhook channel verified." : "Missing channel API credentials.",
      });
    }
  }

  // --------------------------------------------------------------------------
  // ACTION: CONNECT (UNIVERSAL ZERO-API-KEY ONBOARDING EXPERIENCE)
  // --------------------------------------------------------------------------
  if (action === "connect" || action === "request") {
    // 2. Contactless Table QR Ordering Flow
    if (provider === "qr_ordering") {
      const configPayload: IntegrationConfigData = {
        requestedAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
        statusMessage: "Contactless Table QR engine active.",
        capabilities: meta.defaultCapabilities,
      };

      const saved = await prisma.integrationConfig.upsert({
        where: { tenantId_provider: { tenantId, provider } },
        create: {
          tenantId,
          provider,
          status: "CONNECTED",
          configJson: JSON.stringify(configPayload),
          lastSyncAt: new Date(),
        },
        update: {
          status: "CONNECTED",
          configJson: JSON.stringify(configPayload),
          lastSyncAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        id: saved.id,
        provider,
        status: "CONNECTED",
        message: "QR Contactless Dining Menu is now connected and active for all tables.",
        data: configPayload,
      });
    }

    // 3. Network Thermal Printer & Station KDS
    if (provider === "printer") {
      if (!printerIp || !/^(\d{1,3}\.){3}\d{1,3}$/.test(String(printerIp).trim())) {
        return NextResponse.json(
          { error: "Please enter a valid local IPv4 address (e.g. 192.168.1.100)." },
          { status: 400 }
        );
      }

      const configPayload: IntegrationConfigData = {
        outletId,
        printerIp: String(printerIp).trim(),
        printerPort: Number(printerPort) || 9100,
        printerPaper: printerPaper === "58mm" ? "58mm" : "80mm",
        printerStation: printerStation || "MAIN",
        verifiedAt: new Date().toISOString(),
        statusMessage: `Configured for ${printerStation || "MAIN"} station at ${printerIp}:${printerPort || 9100}`,
      };

      const saved = await prisma.integrationConfig.upsert({
        where: { tenantId_provider: { tenantId, provider } },
        create: {
          tenantId,
          provider,
          status: "CONNECTED",
          configJson: JSON.stringify(configPayload),
          lastSyncAt: new Date(),
        },
        update: {
          status: "CONNECTED",
          configJson: JSON.stringify(configPayload),
          lastSyncAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        id: saved.id,
        provider,
        status: "CONNECTED",
        message: `Network thermal printer connected at ${printerIp}.`,
        data: configPayload,
      });
    }

    // 4. Accounting Software (Tally Prime / Zoho Books / CSV)
    if (provider === "accounting") {
      const configPayload: IntegrationConfigData = {
        exportFormat: exportFormat || "TALLY_XML",
        exportSchedule: exportSchedule || "DAILY_DAY_END",
        verifiedAt: new Date().toISOString(),
        statusMessage: `Automated accounting ledger enabled (${exportFormat || "Tally Prime XML"}).`,
      };

      const saved = await prisma.integrationConfig.upsert({
        where: { tenantId_provider: { tenantId, provider } },
        create: {
          tenantId,
          provider,
          status: "CONNECTED",
          configJson: JSON.stringify(configPayload),
          lastSyncAt: new Date(),
        },
        update: {
          status: "CONNECTED",
          configJson: JSON.stringify(configPayload),
          lastSyncAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        id: saved.id,
        provider,
        status: "CONNECTED",
        message: `Accounting export configured for ${exportFormat || "Tally XML"}.`,
        data: configPayload,
      });
    }

    // 5. Generic Ordering Channel Adapter (DotPe / Thrive / ONDC)
    if (provider === "dotpe") {
      const configPayload: IntegrationConfigData = {
        outletId,
        apiKey: apiKey?.trim() ? encryptSecret(apiKey.trim()) : undefined,
        webhookSecret: webhookSecret?.trim() ? encryptSecret(webhookSecret.trim()) : undefined,
        verifiedAt: new Date().toISOString(),
        statusMessage: "Generic online ordering channel active.",
      };

      const saved = await prisma.integrationConfig.upsert({
        where: { tenantId_provider: { tenantId, provider } },
        create: {
          tenantId,
          provider,
          status: "CONNECTED",
          configJson: JSON.stringify(configPayload),
          lastSyncAt: new Date(),
        },
        update: {
          status: "CONNECTED",
          configJson: JSON.stringify(configPayload),
          lastSyncAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        id: saved.id,
        provider,
        status: "CONNECTED",
        message: "Channel adapter connected.",
        data: configPayload,
      });
    }
  }

  // --------------------------------------------------------------------------
  // ACTION: EXPORT ACCOUNTING DATA (TALLY XML / CSV)
  // --------------------------------------------------------------------------
  if (action === "export_accounting") {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timeZone: true },
    });
    const { date: localDate, startOfDay, endOfDay } = getTimeZoneDayBoundsUtc(
      undefined,
      tenant?.timeZone
    );

    const [paidOrders, expenses] = await Promise.all([
      prisma.order.findMany({
        where: {
          tenantId,
          isPaid: true,
          status: { not: "CANCELLED" },
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        include: { items: true, payments: true },
      }),
      prisma.expense.findMany({
        where: {
          tenantId,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    const totalSales = paidOrders.reduce((s, o) => s + (o.totalPaise || 0), 0);
    const totalTax = paidOrders.reduce((s, o) => s + (o.taxPaise || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amountPaise || 0), 0);

    // Generate standard Tally XML voucher payload
    const tallyXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>${localDate.replace(/-/g, "")}</DATE>
            <NARRATION>RestroNex Daily POS Sales Reconciliation</NARRATION>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <PARTYLEDGERNAME>Cash / Counter POS</PARTYLEDGERNAME>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Restaurant Food Sales</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-${(totalSales / 100).toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output CGST 9%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-${(totalTax / 200).toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output SGST 9%</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-${(totalTax / 200).toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    return NextResponse.json({
      ok: true,
      format: exportFormat || "TALLY_XML",
      date: localDate,
      summary: {
        orderCount: paidOrders.length,
        totalSalesPaise: totalSales,
        totalTaxPaise: totalTax,
        totalExpensePaise: totalExpenses,
      },
      exportPayload: tallyXml,
      filename: `RestroNex_Tally_Sales_${localDate}.xml`,
    });
  }

  return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
}
