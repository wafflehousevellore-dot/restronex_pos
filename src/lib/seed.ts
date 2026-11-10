import { prisma } from "./db";
import { pricingPlans } from "./brand";

const LEGACY_MONTHLY_PAISE: Record<string, number> = {
  starter: 20000,
  growth: 30000,
  business: 50000,
};

export async function ensureSeedPlans() {
  for (let idx = 0; idx < pricingPlans.length; idx++) {
    const bp = pricingPlans[idx];
    const targetMonthlyPaise = bp.priceMonthly * 100;
    const targetAnnualPaise = bp.priceAnnual * 100;
    const featuresJson = JSON.stringify(bp.features);

    const existing = await prisma.subscriptionPlan.findUnique({ where: { slug: bp.slug } });
    if (!existing) {
      await prisma.subscriptionPlan.create({
        data: {
          name: bp.name,
          slug: bp.slug,
          priceMonthlyPaise: targetMonthlyPaise,
          priceAnnualPaise: targetAnnualPaise,
          maxOutlets: bp.maxOutlets,
          maxUsers: bp.maxUsers,
          featuresJson,
          sortOrder: idx + 1,
        },
      });
    } else if (existing.priceMonthlyPaise === LEGACY_MONTHLY_PAISE[bp.slug]) {
      // Automatically migrate legacy ₹200/₹300/₹500 catalog plans to updated ₹99/₹199/₹299 without touching existing Subscriptions
      await prisma.subscriptionPlan.update({
        where: { id: existing.id },
        data: {
          name: bp.name,
          priceMonthlyPaise: targetMonthlyPaise,
          priceAnnualPaise: targetAnnualPaise,
          maxOutlets: bp.maxOutlets,
          maxUsers: bp.maxUsers,
          featuresJson,
          sortOrder: idx + 1,
        },
      });
    }
  }

  await prisma.subscriptionPlan.deleteMany({ where: { slug: "enterprise" } }).catch(() => {});
}
