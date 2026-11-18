import crypto from "crypto";
import { prisma } from "@/lib/db";
import {
  AggregatorCredentials,
  AggregatorProvider,
  ConnectionStatus,
  PricingStrategy,
} from "../core/integration-types";
import { EncryptionError } from "../core/integration-errors";

const ENCRYPTION_SECRET = process.env.AGGREGATOR_ENCRYPTION_KEY || "restronex_enterprise_secret_key_32_bytes_len!";
const ALGORITHM = "aes-256-gcm";

export class AggregatorConnectionService {
  /**
   * Encrypt sensitive credentials using AES-256-GCM
   */
  public static encryptCredentials(credentials: AggregatorCredentials): string {
    try {
      const iv = crypto.randomBytes(12);
      const key = crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      const json = JSON.stringify(credentials);
      let encrypted = cipher.update(json, "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag().toString("hex");

      return JSON.stringify({
        iv: iv.toString("hex"),
        data: encrypted,
        tag: authTag,
      });
    } catch (err) {
      throw new EncryptionError("Failed to encrypt credentials: " + (err as Error).message);
    }
  }

  /**
   * Decrypt sensitive credentials using AES-256-GCM
   */
  public static decryptCredentials(encryptedJson?: string | null): AggregatorCredentials {
    if (!encryptedJson) return {};
    try {
      const parsed = JSON.parse(encryptedJson);
      if (!parsed.iv || !parsed.data || !parsed.tag) return {};

      const key = crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();
      const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(parsed.iv, "hex"));
      decipher.setAuthTag(Buffer.from(parsed.tag, "hex"));

      let decrypted = decipher.update(parsed.data, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return JSON.parse(decrypted);
    } catch {
      return {};
    }
  }

  /**
   * Get connection details for a provider and tenant
   */
  public static async getConnection(tenantId: string, provider: AggregatorProvider) {
    const conn = await prisma.aggregatorConnection.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
    });

    if (!conn) {
      return {
        provider,
        status: "NOT_CONNECTED" as ConnectionStatus,
        testMode: true,
        autoAccept: true,
        defaultPrepMinutes: 15,
        pricingStrategy: "MASTER_EQUAL" as PricingStrategy,
        priceHikeValue: 0,
        lastSyncAt: null,
        hasCredentials: false,
      };
    }

    return {
      id: conn.id,
      provider: conn.provider as AggregatorProvider,
      status: conn.status as ConnectionStatus,
      testMode: conn.testMode,
      autoAccept: conn.autoAccept,
      defaultPrepMinutes: conn.defaultPrepMinutes,
      pricingStrategy: conn.pricingStrategy as PricingStrategy,
      priceHikeValue: conn.priceHikeValue,
      lastSyncAt: conn.lastSyncAt,
      hasCredentials: !!conn.credentialsEncrypted,
    };
  }

  /**
   * Save or update provider connection
   */
  public static async saveConnection(params: {
    tenantId: string;
    provider: AggregatorProvider;
    credentials?: AggregatorCredentials;
    testMode?: boolean;
    autoAccept?: boolean;
    defaultPrepMinutes?: number;
    pricingStrategy?: PricingStrategy;
    priceHikeValue?: number;
    status?: ConnectionStatus;
  }) {
    const {
      tenantId,
      provider,
      credentials,
      testMode = true,
      autoAccept = true,
      defaultPrepMinutes = 15,
      pricingStrategy = "MASTER_EQUAL",
      priceHikeValue = 0,
      status = "CONNECTED",
    } = params;

    let encryptedCreds: string | undefined = undefined;
    if (credentials) {
      encryptedCreds = this.encryptCredentials(credentials);
    }

    const updated = await prisma.aggregatorConnection.upsert({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
      create: {
        tenantId,
        provider,
        status,
        credentialsEncrypted: encryptedCreds,
        testMode,
        autoAccept,
        defaultPrepMinutes,
        pricingStrategy,
        priceHikeValue,
      },
      update: {
        status,
        ...(encryptedCreds !== undefined ? { credentialsEncrypted: encryptedCreds } : {}),
        testMode,
        autoAccept,
        defaultPrepMinutes,
        pricingStrategy,
        priceHikeValue,
      },
    });

    return updated;
  }

  /**
   * Disconnect aggregator
   */
  public static async disconnect(tenantId: string, provider: AggregatorProvider) {
    await prisma.aggregatorConnection.updateMany({
      where: { tenantId, provider },
      data: {
        status: "DISCONNECTED",
        credentialsEncrypted: null,
      },
    });

    // Also toggle mapped outlets offline
    await prisma.aggregatorOutletMapping.updateMany({
      where: { tenantId, provider },
      data: { isOnline: false },
    });

    return { success: true };
  }
}
