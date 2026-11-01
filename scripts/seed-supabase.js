const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const connectionString = "postgresql://postgres.lyazkknncizzhqzamqmd:Restronex%402026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function seed() {
  console.log("Connecting to Supabase PostgreSQL to seed initial plans and demo records...");
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    // 1. Seed Subscription Plans (Starter ₹200, Growth ₹300, Business ₹500)
    console.log("Seeding subscription plans...");
    const plans = [
      {
        id: "plan_starter",
        name: "Starter",
        slug: "starter",
        priceMonthlyPaise: 20000,
        priceAnnualPaise: 200000,
        maxOutlets: 1,
        maxUsers: 5,
        featuresJson: JSON.stringify(["1 Outlet", "5 Staff", "Core POS billing", "Menu & category management", "Basic order operations", "Essential reports", "Basic restaurant settings"]),
        sortOrder: 1,
      },
      {
        id: "plan_growth",
        name: "Growth",
        slug: "growth",
        priceMonthlyPaise: 30000,
        priceAnnualPaise: 300000,
        maxOutlets: 5,
        maxUsers: 25,
        featuresJson: JSON.stringify(["Up to 5 Outlets", "25 Staff", "Core POS billing", "Menu & category management", "Outlet management", "Inventory functionality", "Advanced reports", "Staff & outlet permissions"]),
        sortOrder: 2,
      },
      {
        id: "plan_business",
        name: "Business",
        slug: "business",
        priceMonthlyPaise: 50000,
        priceAnnualPaise: 500000,
        maxOutlets: 50,
        maxUsers: 200,
        featuresJson: JSON.stringify(["Multi-outlet restaurant operations", "Centralized management", "Consolidated reports", "Advanced inventory capabilities", "Outlet-specific settings & permissions", "Unlimited staff accounts", "Priority 24×7 support"]),
        sortOrder: 3,
      },
    ];

    for (const p of plans) {
      await client.query(`
        INSERT INTO "SubscriptionPlan" ("id", "name", "slug", "priceMonthlyPaise", "priceAnnualPaise", "maxOutlets", "maxUsers", "featuresJson", "sortOrder")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT ("slug") DO UPDATE SET
          "name" = EXCLUDED."name",
          "priceMonthlyPaise" = EXCLUDED."priceMonthlyPaise",
          "priceAnnualPaise" = EXCLUDED."priceAnnualPaise",
          "maxOutlets" = EXCLUDED."maxOutlets",
          "maxUsers" = EXCLUDED."maxUsers",
          "featuresJson" = EXCLUDED."featuresJson",
          "sortOrder" = EXCLUDED."sortOrder";
      `, [p.id, p.name, p.slug, p.priceMonthlyPaise, p.priceAnnualPaise, p.maxOutlets, p.maxUsers, p.featuresJson, p.sortOrder]);
    }
    console.log("Seeded 3 plans: Starter, Growth, Business");

    // 2. Demo User (owner@demo.in / demo1234)
    const demoEmail = "owner@demo.in";
    const userRes = await client.query('SELECT "id" FROM "User" WHERE "email" = $1', [demoEmail]);
    let userId;
    if (userRes.rows.length === 0) {
      const hash = await bcrypt.hash("demo1234", 10);
      const inserted = await client.query(`
        INSERT INTO "User" ("email", "name", "role", "clerkId")
        VALUES ($1, $2, $3, $4)
        RETURNING "id";
      `, [demoEmail, "Demo Owner", "OWNER", hash.slice(0, 20)]);
      userId = inserted.rows[0].id;
      console.log("Created demo owner user: owner@demo.in / demo1234");
    } else {
      userId = userRes.rows[0].id;
    }

    // 3. Demo Tenant
    const tenantRes = await client.query('SELECT count(*) as cnt FROM "Tenant";');
    if (parseInt(tenantRes.rows[0].cnt) === 0) {
      const tenantInsert = await client.query(`
        INSERT INTO "Tenant" ("name", "slug", "businessType", "email", "phone")
        VALUES ($1, $2, $3, $4, $5)
        RETURNING "id";
      `, ["Spice Route — Demo", "spice-route-demo", "Fine Dining", demoEmail, "+91 98765 43210"]);
      const tenantId = tenantInsert.rows[0].id;

      // Membership
      await client.query(`
        INSERT INTO "Membership" ("userId", "tenantId", "role")
        VALUES ($1, $2, 'OWNER');
      `, [userId, tenantId]);

      // Outlet
      const outletInsert = await client.query(`
        INSERT INTO "Outlet" ("tenantId", "name", "slug", "address", "city", "phone")
        VALUES ($1, 'Koramangala — Main Outlet', 'main-demo', '8th Block, Koramangala, Bengaluru', 'Bengaluru', '+91 98765 43210')
        RETURNING "id";
      `, [tenantId]);
      const outletId = outletInsert.rows[0].id;

      // Menu Categories & Items
      const catInsert = await client.query(`
        INSERT INTO "MenuCategory" ("tenantId", "name", "slug", "sortOrder")
        VALUES ($1, 'Main Course', 'main-course', 1)
        RETURNING "id";
      `, [tenantId]);
      const catId = catInsert.rows[0].id;

      await client.query(`
        INSERT INTO "MenuItem" ("tenantId", "categoryId", "name", "pricePaise", "isVeg", "description")
        VALUES 
          ($1, $2, 'Butter Chicken', 34900, false, 'Tender chicken in rich makhani gravy'),
          ($1, $2, 'Paneer Butter Masala', 29900, true, 'Fresh paneer in creamy spiced tomato gravy'),
          ($1, $2, 'Dal Makhani', 24900, true, 'Slow-cooked black lentils with butter and cream');
      `, [tenantId, catId]);

      // Tables
      for (let i = 1; i <= 8; i++) {
        await client.query(`
          INSERT INTO "Table" ("tenantId", "outletId", "number", "area", "capacity")
          VALUES ($1, $2, $3, 'Main Hall', 4);
        `, [tenantId, outletId, `T${String(i).padStart(2, "0")}`]);
      }

      // Subscription (Growth Plan)
      await client.query(`
        INSERT INTO "Subscription" ("tenantId", "planId", "status", "billingCycle", "currentPeriodEnd", "trialEndsAt")
        VALUES ($1, 'plan_growth', 'TRIALING', 'MONTHLY', NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days');
      `, [tenantId]);

      console.log("Seeded demo tenant, outlet, tables, menu items, and active trial subscription!");
    }

    console.log("Supabase PostgreSQL database seed complete!");
    await client.end();
  } catch (err) {
    console.error("Seed error:", err);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

seed();

