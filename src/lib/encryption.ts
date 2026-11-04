import crypto from "crypto";

/**
 * Enterprise Server-Side Credential Encryption (AES-256-GCM)
 * Used to store restaurant merchant Razorpay secrets safely in PostgreSQL.
 * Plaintext secrets are never stored or exposed to Supabase clients.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret =
    process.env.PAYMENT_ENCRYPTION_KEY ||
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    "restronex-default-secure-passphrase-32b";

  // Derive 32-byte key using SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext string into a safe storage string:
 * Format: iv_hex:authTag_hex:ciphertext_hex
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a stored secret string.
 */
export function decryptSecret(encryptedPayload: string | null | undefined): string | null {
  if (!encryptedPayload) return null;
  try {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) return null;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}

/**
 * Masks a Key ID or Secret for safe UI display (e.g. "rzp_test_••••••••1234")
 */
export function maskCredential(cred: string | null | undefined): string {
  if (!cred) return "Not configured";
  if (cred.length <= 8) return "••••••••";
  return `${cred.slice(0, 8)}••••••••${cred.slice(-4)}`;
}
