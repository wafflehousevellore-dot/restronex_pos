const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const connectionString = "postgresql://postgres.lyazkknncizzhqzamqmd:Restronex%402026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";
const sqlPath = path.join(__dirname, "../supabase/migrations/20261116000001_kds_automatic_order_system.sql");

async function applyMigration() {
  console.log("Connecting to Supabase PostgreSQL at aws-0-eu-west-1.pooler.supabase.com:5432...");
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log("Connected! Reading migration SQL...");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("Executing KDS migration SQL...");
    await client.query(sql);
    console.log("✓ KDS Migration executed successfully!");

    const ktCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'KitchenTicket'
      ORDER BY ordinal_position;
    `);
    console.log("KitchenTicket columns now:", ktCols.rows.map(r => r.column_name).join(", "));

    const orderCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Order'
      ORDER BY ordinal_position;
    `);
    console.log("Order columns now:", orderCols.rows.map(r => r.column_name).join(", "));

    await client.end();
  } catch (err) {
    console.error("Migration error:", err);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

applyMigration();
