import { AggregatorCredentials, MasterMenuSyncResult, MenuItemSyncPayload } from "../../core/integration-types";

export class ZomatoApiClient {
  private baseUrl = "https://api.zomato.com/v1";

  constructor(private credentials: AggregatorCredentials) {
    if (credentials.environment === "sandbox") {
      this.baseUrl = "https://sandbox-api.zomato.com/v1";
    }
  }

  public async pushMenu(storeId: string, items: MenuItemSyncPayload[]): Promise<MasterMenuSyncResult> {
    if (!this.credentials.apiKey || this.credentials.environment === "sandbox") {
      return {
        provider: "ZOMATO",
        storeId,
        totalCategories: new Set(items.map(i => i.categoryName)).size,
        totalItems: items.length,
        syncedAt: new Date().toISOString(),
        status: "SUCCESS",
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/restaurants/${storeId}/menu`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.credentials.apiKey}`,
        },
        body: JSON.stringify({
          res_id: storeId,
          items: items.map(item => ({
            item_id: item.providerItemId,
            name: item.name,
            category: item.categoryName,
            price: item.pricePaise / 100,
            available: item.isAvailable,
            item_type: item.foodType === "VEG" ? "VEG" : "NON_VEG",
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Zomato Menu API error: ${response.statusText}`);
      }

      return {
        provider: "ZOMATO",
        storeId,
        totalCategories: new Set(items.map(i => i.categoryName)).size,
        totalItems: items.length,
        syncedAt: new Date().toISOString(),
        status: "SUCCESS",
      };
    } catch (err) {
      return {
        provider: "ZOMATO",
        storeId,
        totalCategories: 0,
        totalItems: items.length,
        syncedAt: new Date().toISOString(),
        status: "FAILED",
        errors: [(err as Error).message],
      };
    }
  }

  public async updateStoreStatus(storeId: string, isOnline: boolean, reason?: string) {
    if (!this.credentials.apiKey || this.credentials.environment === "sandbox") {
      return { success: true, message: `Zomato outlet ${storeId} set to ${isOnline ? "ONLINE" : "OFFLINE"}` };
    }

    const response = await fetch(`${this.baseUrl}/restaurants/${storeId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.credentials.apiKey}`,
      },
      body: JSON.stringify({
        status: isOnline ? "ONLINE" : "OFFLINE",
        reason: reason || "Manual toggle via RestroNex",
      }),
    });

    return { success: response.ok };
  }

  public async updateItemAvailability(storeId: string, itemIds: string[], isAvailable: boolean) {
    if (!this.credentials.apiKey || this.credentials.environment === "sandbox") {
      return { success: true, updatedCount: itemIds.length };
    }

    const response = await fetch(`${this.baseUrl}/restaurants/${storeId}/items/availability`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.credentials.apiKey}`,
      },
      body: JSON.stringify({
        item_ids: itemIds,
        in_stock: isAvailable,
      }),
    });

    return { success: response.ok, updatedCount: itemIds.length };
  }

  public async updateOrderStatus(
    storeId: string,
    orderId: string,
    status: string,
    prepTimeMinutes = 15,
    cancelReason?: string
  ) {
    if (!this.credentials.apiKey || this.credentials.environment === "sandbox") {
      return { success: true, message: `Zomato order ${orderId} transitioned to ${status}` };
    }

    const response = await fetch(`${this.baseUrl}/restaurants/${storeId}/orders/${orderId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.credentials.apiKey}`,
      },
      body: JSON.stringify({
        status,
        prep_time: prepTimeMinutes,
        reason: cancelReason,
      }),
    });

    return { success: response.ok };
  }
}
