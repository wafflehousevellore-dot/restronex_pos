
import { prisma } from "../src/lib/db";

async function inspectDb() {
  console.log("================================================================================");
  console.log("RESTRO NEX — STAGE 2 DATABASE INSPECTION & RECONCILIATION");
  console.log("================================================================================");

  // 1. Tenants
  const allTenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true, createdAt: true },
  });
  console.log(`Total Tenants in Database: ${allTenants.length}`);
  allTenants.forEach((t) => console.log(` - ${t.name} (id: ${t.id})`));

  const wphTenant = allTenants.find((t) => t.name === "WAFFLE PLUM HOUSE");
  if (!wphTenant) {
    console.error("WAFFLE PLUM HOUSE tenant not found!");
    return;
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log("WAFFLE PLUM HOUSE TENANT DETAILS:");
  console.log(`Tenant ID: ${wphTenant.id}`);

  // 2. Physical Outlets
  const outlets = await prisma.outlet.findMany({
    where: { tenantId: wphTenant.id },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\nPhysical Outlets Count: ${outlets.length}`);
  outlets.forEach((o, i) => {
    console.log(` Outlet ${i + 1}: ${o.name} (id: ${o.id})`);
    console.log(`   Address: ${o.address || "N/A"}, ${o.city || "N/A"}`);
    console.log(`   Status: ${o.status}, CreatedAt: ${o.createdAt.toISOString()}`);
  });

  // 3. Persisted Mappings
  const mappings = await prisma.aggregatorOutletMapping.findMany({
    where: { tenantId: wphTenant.id },
    include: { outlet: true },
  });
  console.log(`\nTotal External Listing Mappings: ${mappings.length}`);
  const swiggyMappings = mappings.filter((m) => m.provider === "SWIGGY");
  const zomatoMappings = mappings.filter((m) => m.provider === "ZOMATO");
  console.log(` Swiggy Mappings Count: ${swiggyMappings.length}`);
  console.log(` Zomato Mappings Count: ${zomatoMappings.length}`);

  if (mappings.length > 0) {
    mappings.forEach((m) => {
      console.log(` - Mapping ID: ${m.id}`);
      console.log(`   Provider: ${m.provider}`);
      console.log(`   Provider Store ID: ${m.providerStoreId}`);
      console.log(`   Provider Store Name: ${m.providerStoreName}`);
      console.log(`   Outlet: ${m.outlet.name} (id: ${m.outletId})`);
      console.log(`   Is Online: ${m.isOnline}, Rush Mode: ${m.isRushMode}`);
      console.log(`   Last Heartbeat: ${m.lastHeartbeatAt ? m.lastHeartbeatAt.toISOString() : "Never"}`);
      const isTest = /test|mock|sample|dummy|s[1-3]|z1/i.test(m.providerStoreId);
      console.log(`   Is Test Fixture: ${isTest}`);
    });
  } else {
    console.log(" -> No mappings currently persisted in production DB (0 / 4 unmapped baseline).");
  }

  // Also check if any mappings exist across other tenants
  const otherMappings = await prisma.aggregatorOutletMapping.findMany({
    where: { tenantId: { not: wphTenant.id } },
  });
  console.log(`\nMappings in Other Tenants: ${otherMappings.length}`);

  // 4. Provider Connection Records (Authorization & Credentials)
  const connections = await prisma.aggregatorConnection.findMany({
    where: { tenantId: wphTenant.id },
  });
  console.log(`\nAggregator Connections for WAFFLE PLUM HOUSE: ${connections.length}`);
  connections.forEach((c) => {
    console.log(` - Provider: ${c.provider}`);
    console.log(`   Status: ${c.status}`);
    console.log(`   Has Encrypted Credentials: ${!!c.credentialsEncrypted}`);
    console.log(`   Auto Accept: ${c.autoAccept}`);
    console.log(`   Default Prep Minutes: ${c.defaultPrepMinutes}`);
    console.log(`   Pricing Strategy: ${c.pricingStrategy}`);
    console.log(`   Last Synced: ${c.lastSyncAt ? c.lastSyncAt.toISOString() : "Never"}`);
  });

  // 5. Orders Audit
  const totalOrders = await prisma.order.count({ where: { tenantId: wphTenant.id } });
  const activeOrders = await prisma.order.count({
    where: {
      tenantId: wphTenant.id,
      status: { notIn: ["BILLED", "CANCELLED", "REFUNDED", "COMPLETED"] },
    },
  });
  const aggregatorRefs = await prisma.aggregatorOrderReference.findMany({
    where: { tenantId: wphTenant.id },
  });

  console.log(`\nOrders Audit:`);
  console.log(` Total Orders for WAFFLE PLUM HOUSE: ${totalOrders}`);
  console.log(` Active Non-Closed Orders: ${activeOrders}`);
  console.log(` Aggregator Order References: ${aggregatorRefs.length}`);
  aggregatorRefs.forEach((r) => {
    console.log(`   Ref ID: ${r.id}, Provider: ${r.provider}, Provider Order ID: ${r.providerOrderId}, Status: ${r.orderStatus}`);
  });

  // 6. Webhook Events
  const webhooks = await prisma.aggregatorWebhookEvent.findMany({
    where: { OR: [{ tenantId: wphTenant.id }, { tenantId: null }] },
  });
  console.log(`\nAggregator Webhook Events in DB: ${webhooks.length}`);

  // 7. Exception Queue
  const exceptions = await prisma.aggregatorExceptionQueue.findMany({
    where: { tenantId: wphTenant.id },
  });
  console.log(`Aggregator Exception Queue Records: ${exceptions.length}`);
}

inspectDb().then(() => prisma.$disconnect());
