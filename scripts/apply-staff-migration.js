const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function applyStaffMigration() {
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("No database URL found in environment.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL.");

    const migrationPath = path.join(__dirname, "../supabase/migrations/20261116000002_staff_portal_and_invitations.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");

    console.log("Applying staff portal migration...");
    await client.query(sql);
    console.log("Staff portal migration applied successfully!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyStaffMigration();

