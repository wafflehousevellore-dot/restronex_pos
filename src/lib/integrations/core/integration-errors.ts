export class IntegrationError extends Error {
  public code: string;
  public statusCode: number;

  constructor(message: string, code = "INTEGRATION_ERROR", statusCode = 400) {
    super(message);
    this.name = "IntegrationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class WebhookVerificationError extends IntegrationError {
  constructor(message = "Invalid webhook signature or token") {
    super(message, "WEBHOOK_VERIFICATION_FAILED", 401);
    this.name = "WebhookVerificationError";
  }
}

export class UnmappedStoreError extends IntegrationError {
  constructor(providerStoreId: string, provider: string) {
    super(`Store ${providerStoreId} is not mapped to any RestroNex outlet for ${provider}`, "UNMAPPED_STORE", 422);
    this.name = "UnmappedStoreError";
  }
}

export class UnmappedItemError extends IntegrationError {
  constructor(providerItemId: string, itemName: string) {
    super(`Item '${itemName}' (${providerItemId}) is not mapped to any RestroNex menu item`, "UNMAPPED_ITEM", 422);
    this.name = "UnmappedItemError";
  }
}

export class EncryptionError extends IntegrationError {
  constructor(message = "Failed to encrypt or decrypt aggregator credentials") {
    super(message, "ENCRYPTION_ERROR", 500);
    this.name = "EncryptionError";
  }
}
