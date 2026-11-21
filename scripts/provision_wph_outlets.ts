import { prisma } from "../src/lib/db";

async function main() {
  const tenantId = "cmw4x4r2400004blqji7nny3u"; // WAFFLE PLUM HOUSE
  
  const existingOutlets = await prisma.outlet.findMany({
    where: { tenantId },
  });
  console.log(`Current outlets for WAFFLE PLUM HOUSE (${existingOutlets.length}):`, existingOutlets.map(o => o.name));

  if (existingOutlets.length < 3) {
    const hasOutlet2 = existingOutlets.some(o => o.name.toLowerCase().includes("outlet 2") || o.slug.includes("outlet-2"));
    if (!hasOutlet2) {
      const o2 = await prisma.outlet.create({
        data: {
          tenantId,
          name: "Outlet 2 (Branch)",
          slug: "outlet-2-branch",
          address: "Branch 2, Katpadi Road",
          city: "Vellore",
          phone: "+91 9366418156",
          status: "ACTIVE",
        },
      });
      console.log("Created Outlet 2:", o2.id, o2.name);
    }

    const hasOutlet3 = existingOutlets.some(o => o.name.toLowerCase().includes("outlet 3") || o.slug.includes("outlet-3"));
    if (!hasOutlet3) {
      const o3 = await prisma.outlet.create({
        data: {
          tenantId,
          name: "Outlet 3 (Branch)",
          slug: "outlet-3-branch",
          address: "Branch 3, Phase 2",
          city: "Vellore",
          phone: "+91 9366418156",
          status: "ACTIVE",
        },
      });
      console.log("Created Outlet 3:", o3.id, o3.name);
    }
  }

  const updatedOutlets = await prisma.outlet.findMany({
    where: { tenantId },
    select: { id: true, name: true, slug: true, city: true, status: true },
  });
  console.log("Updated outlets:", updatedOutlets);
}

main()
  .catch((e) => {
    console.error("Error provisioning outlets:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
