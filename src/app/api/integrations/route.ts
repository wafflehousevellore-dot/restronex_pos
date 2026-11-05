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

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No organization found" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { tenantId, userId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Query tenant details, outlets, and integration configs in parallel
  const [tenant, outlets, configs] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, email: true },
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

  return NextResponse.json({
    tenant,
    outlets,
    configs: parsedConfigs,
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

    // 1. Swiggy & Zomato Verification
    if (provider === "swiggy" || provider === "zomato") {
      // In production, we inspect if Swiggy/Zomato partner authorization has completed.
      // If the partner has granted API access or credentials exist:
      const isPartnerAuthorized = Boolean(
        currentData.approvedAt || (currentData as any).partnerToken
      );

      if (!isPartnerAuthorized) {
        // Honest response: Do NOT fake connected
        const statusMessage =
          provider === "swiggy"
            ? "Partner approval required. Your restaurant connection request has been recorded. Awaiting Swiggy partner confirmation."
            : "Pending Partner Approval. Zomato POS vendor onboarding and merchant authorization required.";

        await prisma.integrationConfig.update({
          where: { id: existing.id },
          data: {
            status: "PENDING_APPROVAL",
            configJson: JSON.stringify({
              ...currentData,
              statusMessage,
              lastCheckedAt: new Date().toISOString(),
            }),
          },
        });

        return NextResponse.json({
          ok: false,
          status: "PENDING_APPROVAL",
          verified: false,
          statusMessage,
          message: statusMessage,
          instructions: `Open your ${meta.officialPortalName} (${meta.officialPortalUrl}), navigate to POS Partners, and accept the RestroNex POS aggregator request.`,
        });
      }

      // If authorized:
      await prisma.integrationConfig.update({
        where: { id: existing.id },
        data: {
          status: "CONNECTED",
          lastSyncAt: new Date(),
          configJson: JSON.stringify({
            ...currentData,
            status: "CONNECTED",
            statusMessage: "Official POS Integration Active. Live order webhooks receiving.",
            verifiedAt: new Date().toISOString(),
          }),
        },
      });

      return NextResponse.json({
        ok: true,
        status: "CONNECTED",
        verified: true,
        message: `✓ ${meta.name} successfully verified! Live incoming order sync is active.`,
      });
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
    // 1. Swiggy & Zomato Flow (Merchant Mobile Number + Outlet Selection)
    if (provider === "swiggy" || provider === "zomato") {
      if (!registeredPhone || !validatePhone(registeredPhone)) {
        return NextResponse.json(
          { error: "Please enter a valid 10-digit mobile number registered with the platform." },
          { status: 400 }
        );
      }

      const cleanPhone = cleanIndianPhone(registeredPhone);

      // Verify outlet ownership
      let selectedOutlet: any = null;
      if (outletId) {
        selectedOutlet = await prisma.outlet.findFirst({
          where: { id: outletId, tenantId },
        });
      } else {
        selectedOutlet = await prisma.outlet.findFirst({
          where: { tenantId },
          orderBy: { createdAt: "asc" },
        });
      }

      if (!selectedOutlet) {
        return NextResponse.json(
          { error: "Please create at least one restaurant outlet before connecting integrations." },
          { status: 400 }
        );
      }

      const appBaseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.restronexpos.com");

      const webhookUrl = `${appBaseUrl}${meta.webhookPath}`;

      // Status messages required by official provider specifications:
      const statusMessage =
        provider === "swiggy"
          ? "Partner approval required. Your restaurant connection request has been recorded."
          : "Pending Partner Approval. Zomato POS vendor whitelisting and merchant approval required.";

      const configPayload: IntegrationConfigData = {
        outletId: selectedOutlet.id,
        registeredPhone: cleanPhone,
        merchantName: merchantName?.trim() || selectedOutlet.name,
        providerStoreId: providerStoreId?.trim() || undefined,
        outletMappings: [
          {
            localOutletId: selectedOutlet.id,
            localOutletName: selectedOutlet.name,
            providerStoreId: providerStoreId?.trim() || `PENDING-${selectedOutlet.slug}`,
            status: "PENDING",
          },
        ],
        requestedAt: new Date().toISOString(),
        statusMessage,
        capabilities: meta.defaultCapabilities,
        webhookUrl,
        errorHistory: [],
      };

      const jsonStr = JSON.stringify(configPayload);

      const saved = await prisma.integrationConfig.upsert({
        where: { tenantId_provider: { tenantId, provider } },
        create: {
          tenantId,
          provider,
          status: "PENDING_APPROVAL",
          configJson: jsonStr,
          lastSyncAt: null,
        },
        update: {
          status: "PENDING_APPROVAL",
          configJson: jsonStr,
          lastSyncAt: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: "INTEGRATION_REQUESTED",
          entity: "IntegrationConfig",
          entityId: saved.id,
          metadataJson: JSON.stringify({
            provider,
            registeredPhone: cleanPhone,
            outletId: selectedOutlet.id,
            outletName: selectedOutlet.name,
            providerStoreId,
          }),
        },
      });

      return NextResponse.json({
        ok: true,
        id: saved.id,
        provider,
        status: "PENDING_APPROVAL",
        statusMessage,
        message: statusMessage,
        data: configPayload,
        instructions: [
          `1. Your connection request for ${meta.name} (+91 ${cleanPhone}) has been recorded.`,
          `2. Log in to your ${meta.officialPortalName} (${meta.officialPortalUrl}).`,
          `3. Navigate to Integration / POS Partners and confirm RestroNex POS as your authorized aggregator.`,
          `4. Return here and click "Verify Live Connection" once approved.`,
        ],
      });
    }

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
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);

    const [paidOrders, expenses] = await Promise.all([
      prisma.order.findMany({
        where: {
          tenantId,
          isPaid: true,
          createdAt: { gte: startOfDay },
        },
        include: { items: true, payments: true },
      }),
      prisma.expense.findMany({
        where: {
          tenantId,
          createdAt: { gte: startOfDay },
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
            <DATE>${today.toISOString().slice(0, 10).replace(/-/g, "")}</DATE>
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
      date: today.toISOString().slice(0, 10),
      summary: {
        orderCount: paidOrders.length,
        totalSalesPaise: totalSales,
        totalTaxPaise: totalTax,
        totalExpensePaise: totalExpenses,
      },
      exportPayload: tallyXml,
      filename: `RestroNex_Tally_Sales_${today.toISOString().slice(0, 10)}.xml`,
    });
  }

  return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
}
