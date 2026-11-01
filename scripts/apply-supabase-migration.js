const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const connectionString = "postgresql://postgres.lyazkknncizzhqzamqmd:Restronex%402026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";
const sqlPath = path.join(__dirname, "../supabase/migrations/20261101000000_init_supabase_schema.sql");

async function applyMigration() {
  console.log("Connecting to Supabase PostgreSQL at aws-0-eu-west-1.pooler.supabase.com:5432...");
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log("Connected! Reading migration SQL...");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("Executing migration schema DDL, RLS policies, and indexes...");
    await client.query(sql);
    console.log("Migration executed successfully!");

    // Verify created tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`\nCreated ${tableRes.rows.length} tables in public schema:`);
    console.log(tableRes.rows.map(r => r.table_name).join(", "));

    // Verify RLS policies
    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND rowsecurity = true;
    `);
    console.log(`\nRow Level Security (RLS) active on ${rlsRes.rows.length} tables:`);
    console.log(rlsRes.rows.map(r => r.tablename).join(", "));

    await client.end();
  } catch (err) {
    console.error("Migration error:", err);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

applyMigration();

