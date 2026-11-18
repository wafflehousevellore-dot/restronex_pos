import { prisma } from "@/lib/db";
import { AggregatorProvider } from "../core/integration-types";
import { IntegrationError } from "../core/integration-errors";
import { SwiggyIntegrationProvider } from "../providers/swiggy/adapter";
import { ZomatoIntegrationProvider } from "../providers/zomato/adapter";
import { AggregatorConnectionService } from "./connection-service";

export class AggregatorOutletMappingService {
  /**
   * Get all outlet mappings for a tenant
   */
  public static async getMappings(tenantId: string, provider?: AggregatorProvider) {
    const outlets = await prisma.outlet.findMany({
      where: { tenantId },
      include: {
        aggregatorOutletMappings: {
          where: provider ? { provider } : undefined,
        },
      },
      orderBy: { name: "asc" },
    });

    return outlets.map((outlet) => ({
      outletId: outlet.id,
      outletName: outlet.name,
      outletAddress: outlet.address,
      mappings: outlet.aggregatorOutletMappings.map((m) => ({
        id: m.id,
        provider: m.provider as AggregatorProvider,
        providerStoreId: m.providerStoreId,
        providerStoreName: m.providerStoreName,
        isOnline: m.isOnline,
        isRushMode: m.isRushMode,
        autoOfflineOnClose: m.autoOfflineOnClose,
        posBillPrinting: m.posBillPrinting,
        kotPrinting: m.kotPrinting,
        notificationAudio: m.notificationAudio,
        lastHeartbeatAt: m.lastHeartbeatAt,
      })),
    }));
  }

  /**
   * Map a RestroNex outlet to a provider Store ID
   * Guarantees Cross-Tenant Isolation: Throws if store is already mapped to another tenant!
   */
  public static async mapOutlet(params: {
    tenantId: string;
    outletId: string;
    provider: AggregatorProvider;
    providerStoreId: string;
    providerStoreName?: string;
  }) {
    const { tenantId, outletId, provider, providerStoreId, providerStoreName } = params;

    // 1. Cross-Tenant Protection Check
    const existingOther = await prisma.aggregatorOutletMapping.findFirst({
      where: {
        provider,
        providerStoreId,
        NOT: { tenantId },
      },
    });

    if (existingOther) {
      throw new IntegrationError(
        `Store ID '${providerStoreId}' is already registered to another restaurant organisation. Please contact support.`,
        "CROSS_TENANT_CONFLICT",
        409
      );
    }

    // 2. Upsert mapping for this outlet
    const mapping = await prisma.aggregatorOutletMapping.upsert({
      where: {
        outletId_provider: {
          outletId,
          provider,
        },
      },
      create: {
        tenantId,
        outletId,
        provider,
        providerStoreId,
        providerStoreName: providerStoreName || `${provider} Store (${providerStoreId})`,
        isOnline: true,
      },
      update: {
        providerStoreId,
        providerStoreName: providerStoreName || `${provider} Store (${providerStoreId})`,
        isOnline: true,
      },
    });

    return mapping;
  }

  /**
   * Toggle outlet online/offline status
   */
  public static async toggleStoreStatus(params: {
    tenantId: string;
    outletId: string;
    provider: AggregatorProvider;
    isOnline: boolean;
    reason?: string;
  }) {
    const { tenantId, outletId, provider, isOnline, reason } = params;

    const mapping = await prisma.aggregatorOutletMapping.findUnique({
      where: {
        outletId_provider: {
          outletId,
          provider,
        },
      },
    });

    if (!mapping) {
      throw new IntegrationError(`Outlet is not mapped to ${provider}`, "NOT_MAPPED", 404);
    }

    // Update in database
    const updated = await prisma.aggregatorOutletMapping.update({
      where: { id: mapping.id },
      data: {
        isOnline,
        lastHeartbeatAt: new Date(),
      },
    });

    // Notify aggregator API
    const conn = await prisma.aggregatorConnection.findUnique({
      where: { tenantId_provider: { tenantId, provider } },
    });
    const creds = AggregatorConnectionService.decryptCredentials(conn?.credentialsEncrypted);

    const adapter = provider === "SWIGGY" ? new SwiggyIntegrationProvider() : new ZomatoIntegrationProvider();
    await adapter.updateStoreStatus(creds, mapping.providerStoreId, isOnline, reason);

    return updated;
  }

  /**
   * Toggle rush mode (temporarily inflates prep time by 15 mins)
   */
  public static async toggleRushMode(params: {
    tenantId: string;
    outletId: string;
    provider: AggregatorProvider;
    isRushMode: boolean;
  }) {
    const { outletId, provider, isRushMode } = params;

    return prisma.aggregatorOutletMapping.update({
      where: {
        outletId_provider: {
          outletId,
          provider,
        },
      },
      data: { isRushMode },
    });
  }

  /**
   * Remove outlet mapping
   */
  public static async unmapOutlet(tenantId: string, outletId: string, provider: AggregatorProvider) {
    return prisma.aggregatorOutletMapping.deleteMany({
      where: { tenantId, outletId, provider },
    });
  }
}
