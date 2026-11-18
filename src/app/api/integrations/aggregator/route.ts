import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { AggregatorProvider, PricingStrategy } from "@/lib/integrations/core/integration-types";
import { AggregatorConnectionService } from "@/lib/integrations/services/connection-service";
import { AggregatorOutletMappingService } from "@/lib/integrations/services/outlet-mapping-service";
import { AggregatorMenuSyncService } from "@/lib/integrations/services/menu-sync-service";
import { AggregatorOrderIngestionService } from "@/lib/integrations/services/order-ingestion-service";
import { AggregatorReconciliationService } from "@/lib/integrations/services/reconciliation-service";

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

      const [outletsCount, mappedOutletsCount, activeOrdersCount, syncJobs, exceptionsCount] = await Promise.all([
        prisma.outlet.count({ where: { tenantId } }),
        prisma.aggregatorOutletMapping.count({ where: { tenantId } }),
        prisma.aggregatorOrderReference.count({
          where: {
            tenantId,
            orderStatus: { in: ["PLACED", "ACCEPTED", "PREPARING", "READY_FOR_PICKUP"] },
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
      ]);

      return NextResponse.json({
        swiggy: swiggyConn,
        zomato: zomatoConn,
        stats: {
          outletsCount,
          mappedOutletsCount,
          activeOrdersCount,
          exceptionsCount,
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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[Aggregator API POST Error]:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
