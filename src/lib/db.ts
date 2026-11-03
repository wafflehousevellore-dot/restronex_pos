import "dotenv/config";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { SEED_DB_GZIP_BASE64 } from "./seedDbBuffer";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function ensureDatabaseFile(): string {
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isServerless) {
    const tmpDbPath = "/tmp/dev.db";
    if (!fs.existsSync(tmpDbPath) || fs.statSync(tmpDbPath).size < 1000) {
      try {
        const dbBuffer = zlib.gunzipSync(Buffer.from(SEED_DB_GZIP_BASE64, "base64"));
        fs.writeFileSync(tmpDbPath, dbBuffer);
      } catch (err) {
        console.error("Failed to unpack embedded seed database into /tmp:", err);
      }
    }
    return tmpDbPath;
  }

  // Local development / standalone server environment
  const localDb = path.resolve(process.cwd(), "dev.db");
  if (!fs.existsSync(localDb) || fs.statSync(localDb).size < 1000) {
    try {
      const dbBuffer = zlib.gunzipSync(Buffer.from(SEED_DB_GZIP_BASE64, "base64"));
      fs.writeFileSync(localDb, dbBuffer);
    } catch (err) {
      console.error("Failed to unpack embedded seed database locally:", err);
    }
  }
  return localDb;
}

function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  let prisma: PrismaClient;

  if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
    const pool = new pg.Pool({
      connectionString: dbUrl,
      max: Number(process.env.PG_POOL_MAX || 15),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  } else {
    const finalDbPath = ensureDatabaseFile();
    const adapter = new PrismaBetterSqlite3({ url: `file:${finalDbPath}` });
    prisma = new PrismaClient({ adapter });
  }

  globalForPrisma.prisma = prisma;
  return prisma;
}

export const prisma = getPrisma();
export default prisma;
