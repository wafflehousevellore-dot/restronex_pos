import { AggregatorCredentials, MasterMenuSyncResult, MenuItemSyncPayload } from "../../core/integration-types";

export class SwiggyApiClient {
  private baseUrl = "https://partner.swiggy.com/v1";

  constructor(private credentials: AggregatorCredentials) {
    if (credentials.environment === "sandbox") {
      this.baseUrl = "https://sandbox-partner.swiggy.com/v1";
    }
  }

  public async pushMenu(storeId: string, items: MenuItemSyncPayload[]): Promise<MasterMenuSyncResult> {
    if (!this.credentials.apiKey) {
      return {
        provider: "SWIGGY",
        storeId,
        totalCategories: 0,
        totalItems: items.length,
        syncedAt: new Date().toISOString(),
        status: "FAILED",
        errors: ["Swiggy Partner credentials missing. Complete official partner onboarding to enable menu sync."],
      };
    }

    // Official Swiggy Menu Push Endpoint
    try {
      const response = await fetch(`${this.baseUrl}/restaurants/${storeId}/menu`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.credentials.apiKey}`,
        },
        body: JSON.stringify({
          restaurant_id: storeId,
          items: items.map(item => ({
            id: item.providerItemId,
            name: item.name,
            category: item.categoryName,
            price: item.pricePaise / 100,
            in_stock: item.isAvailable,
            is_veg: item.foodType === "VEG",
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Swiggy Menu API error: ${response.statusText}`);
      }

      return {
        provider: "SWIGGY",
        storeId,
        totalCategories: new Set(items.map(i => i.categoryName)).size,
        totalItems: items.length,
        syncedAt: new Date().toISOString(),
        status: "SUCCESS",
      };
    } catch (err) {
      return {
        provider: "SWIGGY",
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
    if (!this.credentials.apiKey) {
      return { success: false, error: "Swiggy partner credentials not configured." };
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
    if (!this.credentials.apiKey) {
      return { success: false, error: "Swiggy partner credentials not configured.", updatedCount: 0 };
    }

    const response = await fetch(`${this.baseUrl}/restaurants/${storeId}/items/stock`, {
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
    if (!this.credentials.apiKey) {
      return { success: false, error: "Swiggy partner credentials not configured." };
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
