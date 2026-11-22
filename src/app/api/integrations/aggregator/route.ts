import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { AggregatorProvider, PricingStrategy, ConnectionStatus } from "@/lib/integrations/core/integration-types";
import { AggregatorConnectionService } from "@/lib/integrations/services/connection-service";
import { AggregatorOutletMappingService } from "@/lib/integrations/services/outlet-mapping-service";
import { AggregatorMenuSyncService } from "@/lib/integrations/services/menu-sync-service";
import { AggregatorOrderIngestionService } from "@/lib/integrations/services/order-ingestion-service";
import { AggregatorReconciliationService } from "@/lib/integrations/services/reconciliation-service";
import { AggregatorStatusSyncService } from "@/lib/integrations/services/status-sync-service";

async function getAuthContext(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return null;
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return null;
  return { userId, tenantId };
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { tenantId } = ctx;

  const action = req.nextUrl.searchParams.get("action") || "status";
  const provider = (req.nextUrl.searchParams.get("provider")?.toUpperCase() as AggregatorProvider) || undefined;

  try {
    if (action === "status") {
      const swiggyConn = await AggregatorConnectionService.getConnection(tenantId, "SWIGGY");
      const zomatoConn = await AggregatorConnectionService.getConnection(tenantId, "ZOMATO");

      const results = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { id: true, name: true, slug: true },
        }),
        prisma.outlet.count({ where: { tenantId } }),
        prisma.outlet.findMany({
          where: { tenantId },
          select: { id: true, name: true, slug: true, city: true, status: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.aggregatorOutletMapping.findMany({
          where: { tenantId },
        }),
        prisma.aggregatorOrderReference.count({
          where: {
            tenantId,
            orderStatus: { in: ["PLACED", "ACCEPTED", "PREPARING", "READY_FOR_PICKUP"] },
            rawPayloadJson: { not: { contains: '"test":true' } },
            order: { status: { notIn: ["BILLED", "CANCELLED", "REFUNDED", "COMPLETED"] } },
          },
        }),
        prisma.aggregatorOrderReference.count({
          where: {
            tenantId,
            OR: [
              { rawPayloadJson: { contains: '"test":true' } },
              { providerOrderId: { contains: "TEST" } },
            ],
          },
        }),
        prisma.aggregatorSyncJob.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.aggregatorExceptionQueue.count({
          where: { tenantId, isResolved: false },
        }),
        prisma.aggregatorWebhookEvent.count({
          where: { provider: "SWIGGY", OR: [{ tenantId }, { tenantId: null }] },
        }),
        prisma.aggregatorWebhookEvent.count({
          where: { provider: "ZOMATO", OR: [{ tenantId }, { tenantId: null }] },
        }),
        prisma.aggregatorWebhookEvent.count({
          where: { provider: "SWIGGY", status: "PROCESSED", OR: [{ tenantId }, { tenantId: null }] },
        }),
        prisma.aggregatorWebhookEvent.count({
          where: { provider: "ZOMATO", status: "PROCESSED", OR: [{ tenantId }, { tenantId: null }] },
        }),
        prisma.aggregatorWebhookEvent.findFirst({
          where: { provider: "SWIGGY", OR: [{ tenantId }, { tenantId: null }] },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        prisma.aggregatorWebhookEvent.findFirst({
          where: { provider: "ZOMATO", OR: [{ tenantId }, { tenantId: null }] },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        prisma.aggregatorExceptionQueue.count({
          where: { tenantId, provider: "SWIGGY", isResolved: false },
        }),
        prisma.aggregatorExceptionQueue.count({
          where: { tenantId, provider: "ZOMATO", isResolved: false },
        }),
        prisma.aggregatorExceptionQueue.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      const [
        tenant,
        outletsCount,
        allOutlets,
        allMappings,
        genuineActiveOrdersCount,
        testOrdersCount,
        syncJobs,
        exceptionsCount,
        swiggyWebhooksCount,
        zomatoWebhooksCount,
        swiggyProcessedWebhooksCount,
        zomatoProcessedWebhooksCount,
        latestSwiggyWebhook,
        latestZomatoWebhook,
        swiggyExceptionsCount,
        zomatoExceptionsCount,
        recentExceptions,
      ] = results;

      const swiggyMappings = allMappings.filter((m) => m.provider === "SWIGGY");
      const zomatoMappings = allMappings.filter((m) => m.provider === "ZOMATO");
      const mappedOutletsSet = new Set(allMappings.map((m) => m.outletId));

      const hasSwiggyWebhookSecret = !!process.env.SWIGGY_WEBHOOK_SECRET;
      const hasZomatoWebhookSecret = !!process.env.ZOMATO_WEBHOOK_SECRET;

      // Dynamic multi-tenant listing targets based on actual outlet count:
      const physicalOutletsTarget = outletsCount;
      const swiggyListingsTarget = Math.max(outletsCount, swiggyMappings.length);
      const zomatoListingsTarget = Math.max(outletsCount, zomatoMappings.length);
      const totalListingsTarget = swiggyListingsTarget + zomatoListingsTarget;

      const swiggyStages = {
        merchantAccountActive: {
          key: "merchant_account",
          label: "Merchant Account Active",
          isComplete: !!swiggyConn.hasCredentials || swiggyMappings.length > 0,
          status: (!!swiggyConn.hasCredentials || swiggyMappings.length > 0) ? "VERIFIED" : "PENDING_SETUP",
          detail: (!!swiggyConn.hasCredentials || swiggyMappings.length > 0)
            ? "Merchant portal account verified"
            : "Requires registered restaurant partner account on Swiggy Partner Portal",
        },
        providerApprovalPending: {
          key: "provider_approval",
          label: "Provider Approval Pending",
          isComplete: swiggyConn.status === "CONNECTED",
          status: swiggyConn.status === "CONNECTED" ? "APPROVED" : "APPROVAL_REQUIRED",
          detail: swiggyConn.status === "CONNECTED"
            ? "Official Swiggy POS partner onboarding signed and authorized"
            : "Awaiting official Swiggy Partner API agreement and POS enablement by Swiggy POC",
        },
        apiCredentialsConfigured: {
          key: "api_credentials",
          label: "API Credentials Configured",
          isComplete: !!swiggyConn.hasCredentials,
          status: swiggyConn.hasCredentials ? "CONFIGURED" : "NOT_CONFIGURED",
          detail: swiggyConn.hasCredentials
            ? "Client ID and Partner Secret Token secured in AES-256 vault"
            : "No API credentials configured. Enter live credentials from Swiggy Developer Portal",
        },
        webhookRegistered: {
          key: "webhook_registered",
          label: "Webhook Registered",
          isComplete: swiggyWebhooksCount > 0,
          status: swiggyWebhooksCount > 0 ? "REGISTERED" : "UNREGISTERED",
          detail: swiggyWebhooksCount > 0
            ? `${swiggyWebhooksCount} webhook deliveries ingested`
            : "Endpoint ready; register URL in Swiggy Merchant Developer Console to receive live orders",
        },
        webhookSignatureVerified: {
          key: "webhook_signature",
          label: "Webhook Signature Verified",
          isComplete: hasSwiggyWebhookSecret && swiggyProcessedWebhooksCount > 0,
          status: hasSwiggyWebhookSecret ? (swiggyProcessedWebhooksCount > 0 ? "VERIFIED" : "SECRET_ACTIVE") : "SECRET_REQUIRED",
          detail: hasSwiggyWebhookSecret
            ? (swiggyProcessedWebhooksCount > 0 ? "HMAC-SHA256 signature cryptographic verification confirmed" : "SWIGGY_WEBHOOK_SECRET loaded; awaiting first signed delivery")
            : "SWIGGY_WEBHOOK_SECRET required in production environment variables",
        },
        integrationOperational: {
          key: "integration_operational",
          label: "Integration Operational",
          isComplete: swiggyConn.status === "CONNECTED" && swiggyMappings.length > 0 && swiggyProcessedWebhooksCount > 0,
          status: (swiggyConn.status === "CONNECTED" && swiggyMappings.length > 0) ? "OPERATIONAL" : "DISCONNECTED",
          detail: (swiggyConn.status === "CONNECTED" && swiggyMappings.length > 0)
            ? `Live: ${swiggyMappings.length}/${swiggyListingsTarget} outlets receiving orders`
            : "Disconnected. Requires partner approval, API keys, and outlet mappings",
        },
      };

      const zomatoStages = {
        merchantAccountActive: {
          key: "merchant_account",
          label: "Merchant Account Active",
          isComplete: !!zomatoConn.hasCredentials || zomatoMappings.length > 0,
          status: (!!zomatoConn.hasCredentials || zomatoMappings.length > 0) ? "VERIFIED" : "PENDING_SETUP",
          detail: (!!zomatoConn.hasCredentials || zomatoMappings.length > 0)
            ? "Zomato for Business listing active"
            : "Requires active Zomato restaurant listing for configured outlets",
        },
        providerApprovalPending: {
          key: "provider_approval",
          label: "Provider Approval Pending",
          isComplete: zomatoConn.status === "CONNECTED",
          status: zomatoConn.status === "CONNECTED" ? "APPROVED" : "APPROVAL_REQUIRED",
          detail: zomatoConn.status === "CONNECTED"
            ? "Order Relay POS integration authorized by Zomato"
            : "Awaiting Order Relay POS integration agreement and token from Zomato Partner Operations",
        },
        apiCredentialsConfigured: {
          key: "api_credentials",
          label: "API Credentials Configured",
          isComplete: !!zomatoConn.hasCredentials,
          status: zomatoConn.hasCredentials ? "CONFIGURED" : "NOT_CONFIGURED",
          detail: zomatoConn.hasCredentials
            ? "API Key / Bearer token stored in AES-256 vault"
            : "No API credentials configured. Enter live keys from Zomato Partner Portal",
        },
        webhookRegistered: {
          key: "webhook_registered",
          label: "Webhook Registered",
          isComplete: zomatoWebhooksCount > 0,
          status: zomatoWebhooksCount > 0 ? "REGISTERED" : "UNREGISTERED",
          detail: zomatoWebhooksCount > 0
            ? `${zomatoWebhooksCount} webhook deliveries ingested`
            : "Endpoint ready; configure Relay URL in Zomato Merchant Dashboard",
        },
        webhookSignatureVerified: {
          key: "webhook_signature",
          label: "Webhook Signature Verified",
          isComplete: hasZomatoWebhookSecret && zomatoProcessedWebhooksCount > 0,
          status: hasZomatoWebhookSecret ? (zomatoProcessedWebhooksCount > 0 ? "VERIFIED" : "SECRET_ACTIVE") : "SECRET_REQUIRED",
          detail: hasZomatoWebhookSecret
            ? (zomatoProcessedWebhooksCount > 0 ? "HMAC / Bearer signature cryptographic verification confirmed" : "ZOMATO_WEBHOOK_SECRET loaded; awaiting first signed delivery")
            : "ZOMATO_WEBHOOK_SECRET required in production environment variables",
        },
        integrationOperational: {
          key: "integration_operational",
          label: "Integration Operational",
          isComplete: zomatoConn.status === "CONNECTED" && zomatoMappings.length > 0 && zomatoProcessedWebhooksCount > 0,
          status: (zomatoConn.status === "CONNECTED" && zomatoMappings.length > 0) ? "OPERATIONAL" : "DISCONNECTED",
          detail: (zomatoConn.status === "CONNECTED" && zomatoMappings.length > 0)
            ? `Live: ${zomatoMappings.length}/${zomatoListingsTarget} outlets mapped to Zomato`
            : "Disconnected. Requires partner approval, API keys, and outlet mappings",
        },
      };

      const evaluateStatus = (
        conn: any,
        mappings: any[],
        webhooksCount: number,
        processedCount: number,
        hasSecret: boolean,
        exceptions: number
      ): ConnectionStatus => {
        if (conn.status === "DISABLED") return "DISABLED";
        if (conn.status === "CONNECTED" && conn.hasCredentials && mappings.length > 0 && processedCount > 0) {
          return "CONNECTED";
        }
        if (exceptions > 0 && (conn.hasCredentials || mappings.length > 0)) {
          return "VERIFICATION_FAILED";
        }
        if (conn.hasCredentials && mappings.length > 0 && !hasSecret) {
          return "WEBHOOK_CONFIGURATION_PENDING";
        }
        if (conn.hasCredentials && mappings.length === 0) {
          return "OUTLET_MAPPING_PENDING";
        }
        if (conn.hasCredentials) {
          return "CREDENTIALS_CONFIGURED";
        }
        if (mappings.length > 0 && !conn.hasCredentials) {
          return "CREDENTIALS_PENDING";
        }
        if (conn.status === "SETUP_IN_PROGRESS") return "SETUP_IN_PROGRESS";
        if (conn.id || conn.hasCredentials) return "PROVIDER_APPROVAL_REQUIRED";
        return "NOT_CONNECTED";
      };

      const swiggyComputedStatus = evaluateStatus(
        swiggyConn,
        swiggyMappings,
        swiggyWebhooksCount,
        swiggyProcessedWebhooksCount,
        hasSwiggyWebhookSecret,
        swiggyExceptionsCount
      );

      const zomatoComputedStatus = evaluateStatus(
        zomatoConn,
        zomatoMappings,
        zomatoWebhooksCount,
        zomatoProcessedWebhooksCount,
        hasZomatoWebhookSecret,
        zomatoExceptionsCount
      );

      return NextResponse.json({
        swiggy: {
          ...swiggyConn,
          status: swiggyComputedStatus,
        },
        zomato: {
          ...zomatoConn,
          status: zomatoComputedStatus,
        },
        stats: {
          physicalOutletsCount: outletsCount,
          outletsCount,
          businessOutletsTarget: physicalOutletsTarget,
          totalListingsTarget,
          swiggyListingsTarget,
          zomatoListingsTarget,
          mappedListingsCount: allMappings.length,
          mappedOutletsCount: mappedOutletsSet.size,
          swiggyMappedCount: swiggyMappings.length,
          zomatoMappedCount: zomatoMappings.length,
          activeOrdersCount: genuineActiveOrdersCount,
          testOrdersCount,
          exceptionsCount,
          swiggyWebhooksCount,
          zomatoWebhooksCount,
          hasSwiggyWebhookSecret,
          hasZomatoWebhookSecret,
        },
        dashboard: {
          swiggy: {
            totalMappedOutlets: swiggyMappings.length,
            activeConnections: swiggyComputedStatus === "CONNECTED" ? swiggyMappings.filter((m) => m.isOnline).length : 0,
            pendingConfigurations: (!swiggyConn.hasCredentials || swiggyMappings.length === 0) ? 1 : 0,
            failedVerificationCount: swiggyExceptionsCount,
            lastSuccessfulVerification: swiggyProcessedWebhooksCount > 0 ? (latestSwiggyWebhook?.createdAt || swiggyConn.lastSyncAt) : null,
            lastReceivedWebhook: latestSwiggyWebhook?.createdAt || null,
          },
          zomato: {
            totalMappedOutlets: zomatoMappings.length,
            activeConnections: zomatoComputedStatus === "CONNECTED" ? zomatoMappings.filter((m) => m.isOnline).length : 0,
            pendingConfigurations: (!zomatoConn.hasCredentials || zomatoMappings.length === 0) ? 1 : 0,
            failedVerificationCount: zomatoExceptionsCount,
            lastSuccessfulVerification: zomatoProcessedWebhooksCount > 0 ? (latestZomatoWebhook?.createdAt || zomatoConn.lastSyncAt) : null,
            lastReceivedWebhook: latestZomatoWebhook?.createdAt || null,
          },
          recentErrors: recentExceptions,
        },
        verificationStages: {
          swiggy: swiggyStages,
          zomato: zomatoStages,
        },
        bridgeStatus: {
          status: (swiggyProcessedWebhooksCount > 0 || zomatoProcessedWebhooksCount > 0) ? "ACTIVE" : "STANDBY",
          statusLabel: (swiggyProcessedWebhooksCount > 0 || zomatoProcessedWebhooksCount > 0)
            ? "Production Aggregator Bridge Active"
            : "Production Aggregator Bridge Standby (Awaiting Provider Deliveries)",
          hasSecrets: hasSwiggyWebhookSecret || hasZomatoWebhookSecret,
          totalWebhooksReceived: swiggyWebhooksCount + zomatoWebhooksCount,
          verifiedEvents: swiggyProcessedWebhooksCount + zomatoProcessedWebhooksCount,
        },
        businessStructure: {
          brandName: tenant?.name || "Restaurant Brand",
          outlets: allOutlets,
          listingsBreakdown: {
            swiggy: {
              target: swiggyListingsTarget,
              mapped: swiggyMappings.length,
              rule: "1 listing per physical outlet",
            },
            zomato: {
              target: zomatoListingsTarget,
              mapped: zomatoMappings.length,
              rule: "1 listing per physical outlet",
            },
          },
        },
        recentSyncJobs: syncJobs,
      });
    }

    if (action === "outlet_mappings") {
      const mappings = await AggregatorOutletMappingService.getMappings(tenantId, provider);
      return NextResponse.json({ mappings });
    }

    if (action === "preview_menu") {
      if (!provider) {
        return NextResponse.json({ error: "Provider is required for menu preview" }, { status: 400 });
      }
      const strategy = (req.nextUrl.searchParams.get("strategy") as PricingStrategy) || undefined;
      const hikeValue = req.nextUrl.searchParams.get("hikeValue") ? Number(req.nextUrl.searchParams.get("hikeValue")) : undefined;

      const preview = await AggregatorMenuSyncService.previewMenuSync({
        tenantId,
        provider,
        pricingStrategy: strategy,
        priceHikeValue: hikeValue,
      });
      return NextResponse.json(preview);
    }

    if (action === "reconciliation") {
      const startDateStr = req.nextUrl.searchParams.get("startDate");
      const endDateStr = req.nextUrl.searchParams.get("endDate");
      const outletId = req.nextUrl.searchParams.get("outletId") || undefined;

      const data = await AggregatorReconciliationService.getReconciliation({
        tenantId,
        provider,
        startDate: startDateStr ? new Date(startDateStr) : undefined,
        endDate: endDateStr ? new Date(endDateStr) : undefined,
        outletId,
      });
      return NextResponse.json(data);
    }

    if (action === "export_reconciliation") {
      const csv = await AggregatorReconciliationService.exportCsv({ tenantId, provider });
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="reconciliation_${provider || "all"}_${Date.now()}.csv"`,
        },
      });
    }

    if (action === "exception_queue") {
      const exceptions = await prisma.aggregatorExceptionQueue.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return NextResponse.json({ exceptions });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[Aggregator API GET Error]:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (!ctx) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { tenantId } = ctx;

  try {
    const body = await req.json();
    const action = body.action;

    if (action === "save_connection") {
      const {
        provider,
        credentials,
        testMode,
        autoAccept,
        defaultPrepMinutes,
        pricingStrategy,
        priceHikeValue,
      } = body;

      if (!provider) {
        return NextResponse.json({ error: "Provider is required" }, { status: 400 });
      }

      const updated = await AggregatorConnectionService.saveConnection({
        tenantId,
        provider,
        credentials,
        testMode: testMode ?? true,
        autoAccept: autoAccept ?? true,
        defaultPrepMinutes: defaultPrepMinutes ?? 15,
        pricingStrategy: pricingStrategy || "MASTER_EQUAL",
        priceHikeValue: priceHikeValue ?? 0,
      });

      return NextResponse.json({ success: true, connection: updated });
    }

    if (action === "disconnect") {
      const { provider } = body;
      if (!provider) return NextResponse.json({ error: "Provider is required" }, { status: 400 });

      await AggregatorConnectionService.disconnect(tenantId, provider);
      return NextResponse.json({ success: true });
    }

    if (action === "map_outlet") {
      const { outletId, provider, providerStoreId, providerStoreName } = body;
      if (!outletId || !provider || !providerStoreId) {
        return NextResponse.json({ error: "Missing required outlet mapping parameters" }, { status: 400 });
      }

      const mapping = await AggregatorOutletMappingService.mapOutlet({
        tenantId,
        outletId,
        provider,
        providerStoreId,
        providerStoreName,
      });

      return NextResponse.json({ success: true, mapping });
    }

    if (action === "unmap_outlet") {
      const { outletId, provider } = body;
      if (!outletId || !provider) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

      await AggregatorOutletMappingService.unmapOutlet(tenantId, outletId, provider);
      return NextResponse.json({ success: true });
    }

    if (action === "toggle_store_status") {
      const { outletId, provider, isOnline, reason } = body;
      if (!outletId || !provider) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

      const updated = await AggregatorOutletMappingService.toggleStoreStatus({
        tenantId,
        outletId,
        provider,
        isOnline: Boolean(isOnline),
        reason,
      });

      return NextResponse.json({ success: true, mapping: updated });
    }

    if (action === "toggle_rush_mode") {
      const { outletId, provider, isRushMode } = body;
      if (!outletId || !provider) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

      const updated = await AggregatorOutletMappingService.toggleRushMode({
        tenantId,
        outletId,
        provider,
        isRushMode: Boolean(isRushMode),
      });

      return NextResponse.json({ success: true, mapping: updated });
    }

    if (action === "push_menu_sync") {
      const { provider, outletId } = body;
      if (!provider) return NextResponse.json({ error: "Provider is required" }, { status: 400 });

      const results = await AggregatorMenuSyncService.pushMenuSync({
        tenantId,
        provider,
        outletId,
      });

      return NextResponse.json({ success: true, results });
    }

    if (action === "toggle_item_availability") {
      const { providerItemId, isAvailable, provider } = body;
      if (!providerItemId) return NextResponse.json({ error: "providerItemId is required" }, { status: 400 });

      await AggregatorMenuSyncService.toggleItemAvailability({
        tenantId,
        providerItemId,
        isAvailable: Boolean(isAvailable),
        provider,
      });

      return NextResponse.json({ success: true });
    }

    if (action === "simulate_order") {
      const { provider = "SWIGGY", outletId, items: requestedItems } = body;

      // Find mapped outlet or first outlet
      const mapping = await prisma.aggregatorOutletMapping.findFirst({
        where: {
          tenantId,
          provider,
          ...(outletId ? { outletId } : {}),
        },
        include: { outlet: true },
      });

      if (!mapping) {
        return NextResponse.json(
          { error: `Please map at least one outlet to ${provider} before running test simulation.` },
          { status: 400 }
        );
      }

      // Fetch sample menu items for realistic test
      const menuItems = await prisma.menuItem.findMany({
        where: { tenantId, isActive: true },
        take: 3,
      });

      const testItems = (requestedItems && requestedItems.length > 0)
        ? requestedItems
        : menuItems.length > 0
        ? menuItems.map((m, idx) => ({
            providerItemId: `item_${m.id}`,
            name: m.name,
            quantity: idx === 0 ? 2 : 1,
            unitPricePaise: m.pricePaise,
            variantName: "Standard",
            notes: idx === 0 ? "Extra spicy, separate dressing" : undefined,
          }))
        : [
            {
              providerItemId: "item_demo_1",
              name: "Butter Chicken with Garlic Naan",
              quantity: 2,
              unitPricePaise: 38000,
              variantName: "Boneless",
              notes: "Medium spicy",
            },
            {
              providerItemId: "item_demo_2",
              name: "Fresh Mango Lassi",
              quantity: 2,
              unitPricePaise: 12000,
              variantName: "Chilled",
            },
          ];

      const simOrderId = `${provider === "SWIGGY" ? "SWG" : "ZOM"}-${Math.floor(100000 + Math.random() * 900000)}`;
      const grossAmountPaise = testItems.reduce((acc: number, it: any) => acc + it.unitPricePaise * it.quantity, 0);

      const simPayload = {
        provider: provider as AggregatorProvider,
        providerOrderId: simOrderId,
        displayOrderId: `#${simOrderId.slice(-4)}`,
        providerStoreId: mapping.providerStoreId,
        customerName: `${provider === "SWIGGY" ? "Swiggy" : "Zomato"} Test Customer`,
        customerMaskedPhone: "+91 98765 4****",
        deliveryAddressMasked: "H-402, Green Valley Apartments, Sector 14 (Test Delivery)",
        orderStatus: "PLACED" as const,
        prepTimeMinutes: 15,
        rawPayloadJson: JSON.stringify({ simulated: true, provider, orderId: simOrderId }),
        items: testItems,
        riderName: "Ramesh Kumar (Test Rider)",
        riderPhone: "+91 99887 7****",
        riderStatus: "ASSIGNED",
        grossAmountPaise,
        discountPaise: Math.round(grossAmountPaise * 0.1),
        deliveryFeePaise: 4000,
        taxesPaise: Math.round(grossAmountPaise * 0.05),
      };

      const result = await AggregatorOrderIngestionService.processOrder(simPayload);

      return NextResponse.json({
        success: true,
        simulation: true,
        result,
      });
    }

    if (action === "resolve_exception") {
      const { exceptionId, resolutionNotes } = body;
      if (!exceptionId) return NextResponse.json({ error: "exceptionId is required" }, { status: 400 });

      await prisma.aggregatorExceptionQueue.update({
        where: { id: exceptionId },
        data: {
          isResolved: true,
          resolutionNotes: resolutionNotes || "Resolved by operator",
          resolvedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "test_verification") {
      const { provider } = body;
      if (!provider) return NextResponse.json({ error: "Provider is required" }, { status: 400 });

      const conn = await AggregatorConnectionService.getConnection(tenantId, provider);
      const mappings = await prisma.aggregatorOutletMapping.findMany({ where: { tenantId, provider } });
      const hasSecret = provider === "SWIGGY" ? !!process.env.SWIGGY_WEBHOOK_SECRET : !!process.env.ZOMATO_WEBHOOK_SECRET;

      if (!conn.hasCredentials) {
        return NextResponse.json({
          success: false,
          status: "CREDENTIALS_PENDING",
          message: `API credentials not configured for ${provider}. Obtain official partner authentication details from the provider partnership team.`,
        });
      }

      if (mappings.length === 0) {
        return NextResponse.json({
          success: false,
          status: "OUTLET_MAPPING_PENDING",
          message: `No outlets mapped to ${provider}. Please assign at least one physical outlet to an external store/res ID.`,
        });
      }

      return NextResponse.json({
        success: false,
        status: "PROVIDER_APPROVAL_REQUIRED",
        message: `Credentials recorded in vault and ${mappings.length} outlets mapped. Live connection awaiting official ${provider} POS partner onboarding agreement approval and live order enablement.`,
        verificationReport: {
          credentialsConfigured: true,
          outletsMappedCount: mappings.length,
          webhookSecretActive: hasSecret,
          approvalStatus: "PENDING_OFFICIAL_PROVIDER_SIGN_OFF",
        },
      });
    }

    if (action === "retry_sync_job") {
      const { jobId } = body;
      if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

      const result = await AggregatorStatusSyncService.retryJob(jobId);
      return NextResponse.json(result);
    }

    if (action === "process_sync_queue") {
      const result = await AggregatorStatusSyncService.processPendingSyncJobs();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[Aggregator API POST Error]:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
