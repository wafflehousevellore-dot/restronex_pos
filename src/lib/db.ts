import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
  let prisma: PrismaClient;
  if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
    prisma = new (PrismaClient as any)();
  } else {
    const adapter = new PrismaBetterSqlite3({ url: dbUrl });
    prisma = new PrismaClient({ adapter });
  }
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  return prisma;
}
export const prisma = getPrisma();
export default prisma;
