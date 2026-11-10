import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTenantSubscriptionEntitlements } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const { userId, user } = await getSession();
  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) {
    return NextResponse.json({
      hasTenant: false,
      tenant: null,
      subscription: null,
      user,
    });
  }

  const [tenant, outlets, setting, taxConfigs, categories, menuItems, tables, staff, printers, subscription] =
    await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.outlet.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } }),
      prisma.restaurantSetting.findUnique({ where: { tenantId } }),
      prisma.taxConfig.findMany({ where: { tenantId } }),
      prisma.menuCategory.findMany({
        where: { tenantId },
        include: { items: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.menuItem.findMany({
        where: { tenantId },
        include: { category: true },
        take: 50,
      }),
      prisma.table.findMany({ where: { tenantId }, orderBy: { number: "asc" } }),
      prisma.membership.findMany({ where: { tenantId }, include: { user: true } }),
      prisma.printerDevice.findMany({ where: { tenantId }, orderBy: { isDefaultBilling: "desc" } }),
      getTenantSubscriptionEntitlements(tenantId),
    ]);

  // Never serialize plaintext access token back to the onboarding frontend
  const safeSetting = setting
    ? {
        ...setting,
        whatsappAccessToken: undefined,
        hasWhatsappToken: Boolean(setting.whatsappAccessToken),
      }
    : null;

  return NextResponse.json({
    hasTenant: true,
    tenant,
    outlets,
    setting: safeSetting,
    taxConfigs,
    categories,
    menuItems,
    tables,
    staff,
    printers,
    subscription,
    user,
  });
}
