import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 Configuration with Production Safety Guards
 *
 * Rules:
 * 1. DIRECT_URL preferred for direct DDL migrations (bypassing PgBouncer pooler).
 * 2. DATABASE_URL used for pooled runtime & standard operations.
 * 3. Never allow production migrations or live operations to run against a placeholder.
 * 4. Safe build-time placeholder permitted ONLY during static code generation (`prisma generate`).
 */
const directUrl = process.env.DIRECT_URL;
const databaseUrl = process.env.DATABASE_URL;

const isMigration =
  process.argv.includes("migrate") ||
  process.argv.includes("deploy") ||
  process.argv.includes("push") ||
  process.argv.includes("db:push");

function resolveDatasourceUrl(): string {
  // 1. Direct connection (for schema migrations)
  if (directUrl && directUrl.trim() !== "") {
    return directUrl;
  }

  // 2. Primary database connection (standard pooler / direct URL)
  if (databaseUrl && databaseUrl.trim() !== "") {
    return databaseUrl;
  }

  // 3. Strict guard: Fail safely when running migrations or when in production
  if (isMigration || (process.env.NODE_ENV === "production" && !process.argv.includes("generate"))) {
    throw new Error(
      "[Prisma Config Error] Neither DATABASE_URL nor DIRECT_URL is configured. " +
        "A valid PostgreSQL connection string is strictly required for migrations and database operations."
    );
  }

  // 4. Safe build-time fallback ONLY for static Prisma Client generation (`prisma generate`)
  return "postgresql://build-time-placeholder:5432/postgres";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: resolveDatasourceUrl(),
  },
});
