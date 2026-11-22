export type AggregatorProvider = "SWIGGY" | "ZOMATO";

export type ConnectionStatus =
  | "NOT_CONNECTED"
  | "SETUP_IN_PROGRESS"
  | "PROVIDER_APPROVAL_REQUIRED"
  | "CREDENTIALS_PENDING"
  | "CREDENTIALS_CONFIGURED"
  | "OUTLET_MAPPING_PENDING"
  | "WEBHOOK_CONFIGURATION_PENDING"
  | "VERIFICATION_FAILED"
  | "CONNECTED"
  | "DISABLED"
  | "PENDING_APPROVAL"
  | "CONFIG_REQUIRED"
  | "SYNC_WARNING"
  | "DISCONNECTED";

export type AggregatorOrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "DISPATCHED"
  | "DELIVERED"
  | "CANCELLED";

export type PricingStrategy =
  | "MASTER_EQUAL"
  | "PERCENTAGE_HIKE"
  | "FIXED_HIKE"
  | "CUSTOM_MAPPING";

export interface NormalizedOrderItemAddon {
  id: string;
  name: string;
  pricePaise: number;
  groupName?: string;
}

export interface NormalizedOrderItem {
  providerItemId: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
  variantName?: string;
  notes?: string;
  addons?: NormalizedOrderItemAddon[];
}

export interface NormalizedOrderPayload {
  provider: AggregatorProvider;
  providerOrderId: string;
  displayOrderId: string;
  providerStoreId: string;
  customerName?: string;
  customerMaskedPhone?: string;
  deliveryAddressMasked?: string;
  orderStatus: AggregatorOrderStatus;
  prepTimeMinutes: number;
  rawPayloadJson: string;
  items: NormalizedOrderItem[];
  riderName?: string;
  riderPhone?: string;
  riderStatus?: string;
  grossAmountPaise: number;
  discountPaise: number;
  deliveryFeePaise: number;
  taxesPaise: number;
  commissionPaise?: number;
  netPayoutPaise?: number;
}

export interface AggregatorCredentials {
  apiKey?: string;
  apiSecret?: string;
  merchantId?: string;
  partnerToken?: string;
  webhookSecret?: string;
  posId?: string;
  partnerClientId?: string;
  environment?: "sandbox" | "production";
}

export interface MenuItemSyncPayload {
  providerItemId: string;
  name: string;
  description?: string;
  categoryName: string;
  pricePaise: number;
  isAvailable: boolean;
  foodType: "VEG" | "NON_VEG" | "EGG";
  imageUrl?: string;
  variants?: {
    id: string;
    name: string;
    pricePaise: number;
  }[];
  addonGroups?: {
    id: string;
    name: string;
    minSelections: number;
    maxSelections?: number;
    options: {
      id: string;
      name: string;
      pricePaise: number;
    }[];
  }[];
}

export interface MasterMenuSyncResult {
  provider: AggregatorProvider;
  storeId: string;
  totalCategories: number;
  totalItems: number;
  syncedAt: string;
  status: "SUCCESS" | "FAILED";
  errors?: string[];
}
