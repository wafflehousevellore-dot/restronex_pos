import { prisma } from "./db";

export async function ensureSeedPlans() {
  const plansData = [
    { name: "Starter", slug: "starter", priceMonthlyPaise: 20000, priceAnnualPaise: 200000, maxOutlets: 1, maxUsers: 5, featuresJson: JSON.stringify(["1 Outlet", "5 Staff", "Core POS billing", "Menu & category management", "Basic order operations", "Essential reports", "Basic restaurant settings"]), sortOrder: 1 },
    { name: "Growth", slug: "growth", priceMonthlyPaise: 30000, priceAnnualPaise: 300000, maxOutlets: 5, maxUsers: 25, featuresJson: JSON.stringify(["Up to 5 Outlets", "25 Staff", "Core POS billing", "Menu & category management", "Outlet management", "Inventory functionality", "Advanced reports", "Staff & outlet permissions"]), sortOrder: 2 },
    { name: "Business", slug: "business", priceMonthlyPaise: 50000, priceAnnualPaise: 500000, maxOutlets: 50, maxUsers: 200, featuresJson: JSON.stringify(["Multi-outlet restaurant operations", "Centralized management", "Consolidated reports", "Advanced inventory capabilities", "Outlet-specific settings & permissions", "Unlimited staff accounts", "Priority 24×7 support"]), sortOrder: 3 },
  ];

  for (const p of plansData) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: p.slug },
      update: { name: p.name, priceMonthlyPaise: p.priceMonthlyPaise, priceAnnualPaise: p.priceAnnualPaise, maxOutlets: p.maxOutlets, maxUsers: p.maxUsers, featuresJson: p.featuresJson, sortOrder: p.sortOrder },
      create: p,
    });
  }

  await prisma.subscriptionPlan.deleteMany({ where: { slug: "enterprise" } }).catch(() => {});
}
