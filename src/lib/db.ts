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
  const rawDbUrl = process.env.DATABASE_URL || "file:./dev.db";
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  let prisma: PrismaClient;

  if (rawDbUrl.startsWith("postgres://") || rawDbUrl.startsWith("postgresql://")) {
    // Optimize connection routing: port 5432 provides session pooling without the 200 proxy connection cap
    const dbUrl = rawDbUrl.includes(":6543/")
      ? rawDbUrl.replace(":6543/", ":5432/").replace("?pgbouncer=true", "")
      : rawDbUrl;

    const poolMax = isServerless
      ? Number(process.env.PG_POOL_MAX || 2)
      : Number(process.env.PG_POOL_MAX || 10);

    const pool = new pg.Pool({
      connectionString: dbUrl,
      max: poolMax,
      idleTimeoutMillis: isServerless ? 2000 : 30000,
      connectionTimeoutMillis: 15000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected error on idle pg client:", err);
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
