import { prisma } from "../src/lib/db";

async function main() {
  const tenantId = "cmw4x4r2400004blqji7nny3u";
  console.log(`\n=== TARGET TENANT: WAFFLE PLUM HOUSE (${tenantId}) ===`);

  console.log("\n=== 2. OUTLETS ===");
  const outlets = await prisma.outlet.findMany({
    where: { tenantId },
    select: { id: true, name: true, slug: true, address: true, city: true, phone: true, status: true, createdAt: true },
  });
  console.log(`Found ${outlets.length} Outlets:`, JSON.stringify(outlets, null, 2));

  console.log("\n=== 3. AGGREGATOR CONNECTIONS ===");
  const connections = await prisma.aggregatorConnection.findMany({
    where: { tenantId },
  });
  console.log(`Found ${connections.length} Connections:`, JSON.stringify(connections, null, 2));

  console.log("\n=== 4. AGGREGATOR OUTLET MAPPINGS ===");
  const mappings = await prisma.aggregatorOutletMapping.findMany({
    where: { tenantId },
    include: { outlet: { select: { id: true, name: true, slug: true } } },
  });
  console.log(`Found ${mappings.length} Outlet Mappings:`, JSON.stringify(mappings, null, 2));

  console.log("\n=== 5. AGGREGATOR ORDERS (ACTIVE PIPELINE) ===");
  const aggOrders = await prisma.aggregatorOrderReference.findMany({
    where: { tenantId },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalPaise: true,
          type: true,
          channel: true,
          createdAt: true,
        },
      },
      outlet: { select: { id: true, name: true } },
    },
  });
  console.log(`Found ${aggOrders.length} Aggregator Orders:`, JSON.stringify(aggOrders, null, 2));

  console.log("\n=== 6. ALL ACTIVE ORDERS FOR TENANT (IN PROGRESS) ===");
  const activeOrders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: ["PLACED", "ACCEPTED", "PREPARING", "READY", "READY_FOR_PICKUP"] },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      type: true,
      channel: true,
      totalPaise: true,
      outletId: true,
      createdAt: true,
      customerName: true,
    },
  });
  console.log(`Found ${activeOrders.length} Active Orders in Order table:`, JSON.stringify(activeOrders, null, 2));

  console.log("\n=== 7. ALL ORDERS FOR TENANT (COUNT & BREAKDOWN) ===");
  const totalOrders = await prisma.order.count({ where: { tenantId } });
  const ordersByType = await prisma.order.groupBy({
    by: ["type"],
    where: { tenantId },
    _count: true,
  });
  const ordersByStatus = await prisma.order.groupBy({
    by: ["status"],
    where: { tenantId },
    _count: true,
  });
  const ordersByChannel = await prisma.order.groupBy({
    by: ["channel"],
    where: { tenantId },
    _count: true,
  });
  console.log(`Total Orders: ${totalOrders}`);
  console.log("By Type:", ordersByType);
  console.log("By Status:", ordersByStatus);
  console.log("By Channel:", ordersByChannel);

  console.log("\n=== 8. WEBHOOK EVENTS ===");
  const webhooks = await prisma.aggregatorWebhookEvent.findMany({
    where: { tenantId },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  console.log(`Found ${webhooks.length} Webhook Events for tenant:`, JSON.stringify(webhooks, null, 2));

  console.log("\n=== 9. ALL WEBHOOK EVENTS (ANY TENANT) ===");
  const allWebhooks = await prisma.aggregatorWebhookEvent.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  console.log(`Found ${allWebhooks.length} Total Webhook Events across system:`, JSON.stringify(allWebhooks, null, 2));

  console.log("\n=== 10. EXCEPTION QUEUE ===");
  const exceptions = await prisma.aggregatorExceptionQueue.findMany({
    where: { tenantId },
  });
  console.log(`Found ${exceptions.length} Exceptions:`, JSON.stringify(exceptions, null, 2));

  console.log("\n=== 11. SYNC JOBS ===");
  const syncJobs = await prisma.aggregatorSyncJob.findMany({
    where: { tenantId },
  });
  console.log(`Found ${syncJobs.length} Sync Jobs:`, JSON.stringify(syncJobs, null, 2));
}

main()
  .catch((e) => {
    console.error("Error executing audit:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
