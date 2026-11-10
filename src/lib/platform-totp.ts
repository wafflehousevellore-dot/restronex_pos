import crypto from "crypto";
import { cookies } from "next/headers";
import { isHttpsFromHeaders } from "./auth";

export const PLATFORM_MFA_COOKIE = "restronex_platform_mfa";
export const PLATFORM_MFA_SESSION_SECONDS = 60 * 60 * 8; // 8 hours
export const PLATFORM_TOTP_ISSUER = "RestroNex Platform";
export const PLATFORM_MFA_MAX_FAILURES = 5;
export const PLATFORM_MFA_LOCKOUT_MINUTES = 5;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const BACKUP_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

type StoredBackupEntry = {
  hash: string;
  usedAt: string | null;
};

function getMasterSecret(): string {
  const s =
    process.env.PLATFORM_MFA_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.JWT_SECRET ||
    "";
  if (!s) {
    throw new Error("Missing server secret key for Platform MFA encryption.");
  }
  return s;
}

function deriveAesKey(): Buffer {
  return crypto
    .createHash("sha256")
    .update(`restronex-platform-totp-aes-v1:${getMasterSecret()}`)
    .digest();
}

function deriveHmacKey(): Buffer {
  return crypto
    .createHash("sha256")
    .update(`restronex-platform-totp-hmac-v1:${getMasterSecret()}`)
    .digest();
}

export function encodeBase32(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function decodeBase32(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s\-=]+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error("Invalid Base32 character in TOTP secret.");
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateBase32Secret(byteLength = 20): string {
  return encodeBase32(crypto.randomBytes(byteLength));
}

export function formatBase32Secret(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

export function buildOtpAuthUri(accountEmail: string, secretBase32: string, issuer = PLATFORM_TOTP_ISSUER): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountEmail)}`;
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export function encryptTotpSecret(plainBase32: string): string {
  const key = deriveAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainBase32, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptTotpSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted TOTP secret payload.");
  }
  const key = deriveAesKey();
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const ciphertext = Buffer.from(parts[3], "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function computeTotpAtStep(secretBuffer: Buffer, counterStep: number): string {
  const counterBuf = Buffer.alloc(8);
  const big = BigInt(counterStep);
  counterBuf.writeBigUInt64BE(big, 0);

  const hmac = crypto.createHmac("sha1", secretBuffer).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotpToken(
  secretBase32: string,
  rawToken: string,
  lastUsedStep = -1,
  windowSteps = 1,
  nowMs = Date.now()
): { valid: boolean; matchedStep?: number; replayRejected?: boolean } {
  const cleanToken = rawToken.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanToken)) {
    return { valid: false };
  }

  const secretBuf = decodeBase32(secretBase32);
  const currentStep = Math.floor(nowMs / 30_000);
  const tokenBuf = Buffer.from(cleanToken, "utf8");

  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    const candidateStep = currentStep + offset;
    const expected = computeTotpAtStep(secretBuf, candidateStep);
    const expectedBuf = Buffer.from(expected, "utf8");
    if (crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
      if (candidateStep <= lastUsedStep) {
        return { valid: false, replayRejected: true };
      }
      return { valid: true, matchedStep: candidateStep };
    }
  }

  return { valid: false };
}

function normalizeBackupCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let raw = "";
    const rand = crypto.randomBytes(8);
    for (let j = 0; j < 8; j++) {
      raw += BACKUP_CODE_ALPHABET[rand[j] % BACKUP_CODE_ALPHABET.length];
    }
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

export function hashBackupCode(rawCode: string): string {
  const norm = normalizeBackupCode(rawCode);
  return crypto
    .createHmac("sha256", deriveHmacKey())
    .update(`backup-v1:${norm}`)
    .digest("hex");
}

export function serializeBackupCodes(plainCodes: string[]): string {
  const entries: StoredBackupEntry[] = plainCodes.map((c) => ({
    hash: hashBackupCode(c),
    usedAt: null,
  }));
  return JSON.stringify(entries);
}

export function countRemainingBackupCodes(json?: string | null): number {
  if (!json) return 0;
  try {
    const arr = JSON.parse(json) as StoredBackupEntry[];
    if (!Array.isArray(arr)) return 0;
    return arr.filter((item) => item && !item.usedAt).length;
  } catch {
    return 0;
  }
}

export function verifyAndConsumeBackupCode(
  json: string | null | undefined,
  rawInput: string
): { valid: boolean; updatedJson?: string; remainingCount?: number } {
  if (!json) return { valid: false };
  const norm = normalizeBackupCode(rawInput);
  if (norm.length < 8) return { valid: false };

  let entries: StoredBackupEntry[] = [];
  try {
    entries = JSON.parse(json) as StoredBackupEntry[];
    if (!Array.isArray(entries)) return { valid: false };
  } catch {
    return { valid: false };
  }

  const candidateHash = Buffer.from(hashBackupCode(norm), "hex");
  let matchedIndex = -1;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry || entry.usedAt || !entry.hash) continue;
    const storedBuf = Buffer.from(entry.hash, "hex");
    if (storedBuf.length === candidateHash.length && crypto.timingSafeEqual(storedBuf, candidateHash)) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex === -1) {
    return { valid: false };
  }

  const nowIso = new Date().toISOString();
  const updated = entries.map((entry, idx) =>
    idx === matchedIndex ? { ...entry, usedAt: nowIso } : entry
  );
  const remainingCount = updated.filter((item) => !item.usedAt).length;
  return {
    valid: true,
    updatedJson: JSON.stringify(updated),
    remainingCount,
  };
}

type MfaCookiePayload = {
  uid: string;
  cid: string;
  sid: string;
  iat: number;
  exp: number;
};

export function signPlatformMfaSessionToken(params: {
  userId: string;
  clerkUserId: string;
  sessionId: string;
}): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: MfaCookiePayload = {
    uid: params.userId,
    cid: params.clerkUserId,
    sid: params.sessionId,
    iat: nowSec,
    exp: nowSec + PLATFORM_MFA_SESSION_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", deriveHmacKey())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyPlatformMfaSessionToken(
  token: string | undefined,
  expected: { userId: string; clerkUserId: string; sessionId: string }
): boolean {
  if (!token || !token.includes(".")) return false;
  const [encoded, providedSig] = token.split(".");
  if (!encoded || !providedSig) return false;

  const expectedSig = crypto
    .createHmac("sha256", deriveHmacKey())
    .update(encoded)
    .digest("base64url");

  const bufA = Buffer.from(providedSig, "utf8");
  const bufB = Buffer.from(expectedSig, "utf8");
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as MfaCookiePayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (!decoded || decoded.exp <= nowSec) return false;
    if (decoded.uid !== expected.userId) return false;
    if (decoded.cid !== expected.clerkUserId) return false;
    if (expected.sessionId && decoded.sid !== expected.sessionId) return false;
    return true;
  } catch {
    return false;
  }
}

export async function getPlatformMfaCookie(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(PLATFORM_MFA_COOKIE)?.value;
}

export async function setPlatformMfaCookie(params: {
  userId: string;
  clerkUserId: string;
  sessionId: string;
}) {
  const value = signPlatformMfaSessionToken(params);
  const c = await cookies();
  const isHttps = await isHttpsFromHeaders();
  c.set(PLATFORM_MFA_COOKIE, value, {
    httpOnly: true,
    secure: isHttps || process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PLATFORM_MFA_SESSION_SECONDS,
  });
}

export function evaluateMfaChallenge(params: {
  secretEnc: string;
  backupCodesHashJson: string | null;
  lastUsedStep: number;
  rawCode: string;
}):
  | { ok: true; method: "TOTP"; matchedStep: number }
  | { ok: true; method: "BACKUP"; updatedBackupJson: string; remainingCount: number }
  | { ok: false; replayRejected?: boolean } {
  const clean = params.rawCode.trim();
  const digitsOnly = clean.replace(/\s+/g, "");
  if (/^\d{6}$/.test(digitsOnly)) {
    const plainSecret = decryptTotpSecret(params.secretEnc);
    const res = verifyTotpToken(plainSecret, digitsOnly, params.lastUsedStep);
    if (res.valid && res.matchedStep !== undefined) {
      return { ok: true, method: "TOTP", matchedStep: res.matchedStep };
    }
    return { ok: false, replayRejected: res.replayRejected };
  }

  const backupRes = verifyAndConsumeBackupCode(params.backupCodesHashJson, clean);
  if (backupRes.valid && backupRes.updatedJson !== undefined) {
    return {
      ok: true,
      method: "BACKUP",
      updatedBackupJson: backupRes.updatedJson,
      remainingCount: backupRes.remainingCount ?? 0,
    };
  }

  return { ok: false };
}

export async function clearPlatformMfaCookie() {
  const c = await cookies();
  c.delete(PLATFORM_MFA_COOKIE);
}
