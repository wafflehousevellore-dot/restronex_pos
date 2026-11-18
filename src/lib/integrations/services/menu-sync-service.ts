import { prisma } from "@/lib/db";
import {
  AggregatorProvider,
  MenuItemSyncPayload,
  PricingStrategy,
  MasterMenuSyncResult,
} from "../core/integration-types";
import { SwiggyIntegrationProvider } from "../providers/swiggy/adapter";
import { ZomatoIntegrationProvider } from "../providers/zomato/adapter";
import { AggregatorConnectionService } from "./connection-service";

export class AggregatorMenuSyncService {
  /**
   * Preview master menu transformed with pricing strategy
   */
  public static async previewMenuSync(params: {
    tenantId: string;
    provider: AggregatorProvider;
    pricingStrategy?: PricingStrategy;
    priceHikeValue?: number;
  }) {
    const { tenantId, provider } = params;

    // Fetch existing connection for default strategy
    const conn = await prisma.aggregatorConnection.findUnique({
      where: { tenantId_provider: { tenantId, provider } },
    });

    const strategy = params.pricingStrategy || (conn?.pricingStrategy as PricingStrategy) || "MASTER_EQUAL";
    const hikeValue = params.priceHikeValue ?? (conn?.priceHikeValue || 0);

    // Fetch master menu categories and items
    const categories = await prisma.menuCategory.findMany({
      where: { tenantId, isActive: true },
      include: {
        items: {
          where: { isActive: true },
          include: {
            variants: { where: { isActive: true } },
            addonLinks: {
              include: {
                addonGroup: {
                  include: {
                    options: { where: { isActive: true } },
                  },
                },
              },
            },
            aggregatorMenuMappings: {
              where: { provider },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Helper to calculate price based on strategy
    const computePrice = (basePaise: number, customPaise?: number) => {
      if (strategy === "CUSTOM_MAPPING" && customPaise !== undefined && customPaise > 0) {
        return customPaise;
      }
      if (strategy === "PERCENTAGE_HIKE" && hikeValue > 0) {
        return Math.round(basePaise * (1 + hikeValue / 100));
      }
      if (strategy === "FIXED_HIKE" && hikeValue > 0) {
        return basePaise + Math.round(hikeValue * 100);
      }
      return basePaise;
    };

    const transformedItems: (MenuItemSyncPayload & {
      masterPricePaise: number;
      syncStatus: string;
    })[] = [];

    for (const cat of categories) {
      for (const item of cat.items) {
        const existingMapping = item.aggregatorMenuMappings[0];
        const channelPricePaise = computePrice(item.pricePaise, existingMapping?.pricePaise);

        transformedItems.push({
          providerItemId: existingMapping?.providerItemId || `item_${item.id}`,
          name: item.name,
          description: item.description || undefined,
          categoryName: cat.name,
          masterPricePaise: item.pricePaise,
          pricePaise: channelPricePaise,
          isAvailable: !item.isSoldOut && (existingMapping?.isAvailable ?? true),
          foodType: item.isVeg ? "VEG" : "NON_VEG",
          imageUrl: item.imageUrl || undefined,
          syncStatus: existingMapping?.syncStatus || "PENDING",
          variants: item.variants.map((v) => ({
            id: v.id,
            name: v.name,
            pricePaise: computePrice(v.pricePaise),
          })),
          addonGroups: item.addonLinks.map((link) => ({
            id: link.addonGroup.id,
            name: link.addonGroup.name,
            minSelections: link.addonGroup.minSelections,
            maxSelections: link.addonGroup.maxSelections || undefined,
            options: link.addonGroup.options.map((opt) => ({
              id: opt.id,
              name: opt.name,
              pricePaise: computePrice(opt.pricePaise),
            })),
          })),
        });
      }
    }

    return {
      provider,
      pricingStrategy: strategy,
      priceHikeValue: hikeValue,
      totalCategories: categories.length,
      totalItems: transformedItems.length,
      items: transformedItems,
    };
  }

  /**
   * Push Master Menu to aggregator for all mapped outlets
   */
  public static async pushMenuSync(params: {
    tenantId: string;
    provider: AggregatorProvider;
    outletId?: string;
  }): Promise<MasterMenuSyncResult[]> {
    const { tenantId, provider, outletId } = params;

    // Get mapped outlets
    const mappings = await prisma.aggregatorOutletMapping.findMany({
      where: {
        tenantId,
        provider,
        ...(outletId ? { outletId } : {}),
      },
    });

    if (mappings.length === 0) {
      throw new Error(`No mapped outlets found for ${provider}`);
    }

    // Get transformed menu items
    const preview = await this.previewMenuSync({ tenantId, provider });
    const items = preview.items;

    // Get credentials
    const conn = await prisma.aggregatorConnection.findUnique({
      where: { tenantId_provider: { tenantId, provider } },
    });
    const creds = AggregatorConnectionService.decryptCredentials(conn?.credentialsEncrypted);

    const adapter = provider === "SWIGGY" ? new SwiggyIntegrationProvider() : new ZomatoIntegrationProvider();
    const results: MasterMenuSyncResult[] = [];

    for (const mapping of mappings) {
      // Create AggregatorSyncJob
      const job = await prisma.aggregatorSyncJob.create({
        data: {
          tenantId,
          outletId: mapping.outletId,
          provider,
          jobType: "MENU_PUSH",
          status: "IN_PROGRESS",
          payloadJson: JSON.stringify({ itemsCount: items.length }),
        },
      });

      try {
        const result = await adapter.pushMenu(creds, mapping.providerStoreId, items);

        // Upsert AggregatorMenuMapping for each item
        for (const item of items) {
          const menuItemId = item.providerItemId.startsWith("item_") ? item.providerItemId.replace("item_", "") : null;
          await prisma.aggregatorMenuMapping.upsert({
            where: {
              tenantId_provider_providerItemId: {
                tenantId,
                provider,
                providerItemId: item.providerItemId,
              },
            },
            create: {
              tenantId,
              provider,
              providerItemId: item.providerItemId,
              providerItemName: item.name,
              categoryName: item.categoryName,
              pricePaise: item.pricePaise,
              isAvailable: item.isAvailable,
              foodType: item.foodType,
              syncStatus: result.status === "SUCCESS" ? "SYNCED" : "FAILED",
              lastSyncedAt: new Date(),
              menuItemId: menuItemId || undefined,
            },
            update: {
              providerItemName: item.name,
              categoryName: item.categoryName,
              pricePaise: item.pricePaise,
              isAvailable: item.isAvailable,
              foodType: item.foodType,
              syncStatus: result.status === "SUCCESS" ? "SYNCED" : "FAILED",
              lastSyncedAt: new Date(),
            },
          });
        }

        await prisma.aggregatorSyncJob.update({
          where: { id: job.id },
          data: {
            status: result.status,
            responseJson: JSON.stringify(result),
          },
        });

        results.push(result);
      } catch (err) {
        await prisma.aggregatorSyncJob.update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            errorLog: (err as Error).message,
          },
        });

        results.push({
          provider,
          storeId: mapping.providerStoreId,
          totalCategories: 0,
          totalItems: items.length,
          syncedAt: new Date().toISOString(),
          status: "FAILED",
          errors: [(err as Error).message],
        });
      }
    }

    // Update connection lastSyncAt
    await prisma.aggregatorConnection.updateMany({
      where: { tenantId, provider },
      data: { lastSyncAt: new Date() },
    });

    return results;
  }

  /**
   * Toggle item availability across all mapped outlets of a provider
   */
  public static async toggleItemAvailability(params: {
    tenantId: string;
    providerItemId: string;
    isAvailable: boolean;
    provider?: AggregatorProvider;
  }) {
    const { tenantId, providerItemId, isAvailable, provider } = params;

    const providersToUpdate: AggregatorProvider[] = provider ? [provider] : ["SWIGGY", "ZOMATO"];

    for (const prov of providersToUpdate) {
      // Find mappings
      const mapping = await prisma.aggregatorMenuMapping.findFirst({
        where: {
          tenantId,
          provider: prov,
          OR: [
            { providerItemId },
            { menuItemId: providerItemId.replace("item_", "") },
          ],
        },
      });

      if (mapping) {
        await prisma.aggregatorMenuMapping.update({
          where: { id: mapping.id },
          data: { isAvailable },
        });

        // Push availability to external stores
        const outlets = await prisma.aggregatorOutletMapping.findMany({
          where: { tenantId, provider: prov },
        });

        const conn = await prisma.aggregatorConnection.findUnique({
          where: { tenantId_provider: { tenantId, provider: prov } },
        });
        const creds = AggregatorConnectionService.decryptCredentials(conn?.credentialsEncrypted);

        const adapter = prov === "SWIGGY" ? new SwiggyIntegrationProvider() : new ZomatoIntegrationProvider();
        for (const out of outlets) {
          await adapter.updateItemAvailability(creds, out.providerStoreId, [mapping.providerItemId], isAvailable);
        }
      }
    }

    return { success: true };
  }
}
