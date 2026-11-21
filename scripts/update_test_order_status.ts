import { prisma } from "../src/lib/db";

async function main() {
  const tenantId = "cmw4x4r2400004blqji7nny3u";
  
  const testRef = await prisma.aggregatorOrderReference.findUnique({
    where: {
      tenantId_provider_providerOrderId: {
        tenantId,
        provider: "SWIGGY",
        providerOrderId: "SWG-TEST-675940",
      },
    },
    include: { order: true },
  });

  if (testRef) {
    console.log("Found test order reference:", testRef.providerOrderId, "current status:", testRef.orderStatus, "order status:", testRef.order.status);
    if (testRef.orderStatus === "READY_FOR_PICKUP" && testRef.order.status === "BILLED") {
      const updated = await prisma.aggregatorOrderReference.update({
        where: { id: testRef.id },
        data: { orderStatus: "DELIVERED" },
      });
      console.log("Updated test order reference to DELIVERED:", updated.id);
    }
  }

  const activeCount = await prisma.aggregatorOrderReference.count({
    where: {
      tenantId,
      orderStatus: { in: ["PLACED", "ACCEPTED", "PREPARING", "READY_FOR_PICKUP"] },
    },
  });
  console.log("Remaining active aggregator orders in pipeline:", activeCount);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
