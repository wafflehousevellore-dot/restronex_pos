import { prisma } from "../src/lib/db";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Applying Addon Management Migration to Supabase PostgreSQL...");
  const sqlPath = path.join(__dirname, "../supabase/migrations/20261117000001_addon_management_system.sql");
  const rawSql = fs.readFileSync(sqlPath, "utf-8");

  // Remove full-line comments
  const cleanSql = rawSql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = cleanSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
      console.log("✓ Success:", statement.slice(0, 40).replace(/\n/g, " ") + "...");
    } catch (err: any) {
      console.error("✗ Statement execution failed:", statement.slice(0, 50), err?.message || err);
      throw err;
    }
  }

  console.log("Migration application complete!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
