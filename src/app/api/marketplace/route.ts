import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId, user } = await getSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
    if (!tenantId) {
      return NextResponse.json({ error: "No active restaurant organization context" }, { status: 400 });
    }

    const mem = await prisma.membership.findFirst({
      where: { userId, tenantId },
    });
    if (!mem && !user?.isPlatformAdmin) {
      return NextResponse.json({ error: "Forbidden: Not a member of this restaurant" }, { status: 403 });
    }

    const isOwnerOrManager = Boolean(
      user?.isPlatformAdmin ||
      mem?.role === "OWNER" ||
      mem?.role === "ORG_ADMIN" ||
      mem?.role === "OUTLET_MANAGER"
    );

    // 1. Fetch active subscription to check plan entitlements
    const activeSub = await prisma.subscription.findFirst({
      where: {
        tenantId,
        status: "ACTIVE",
        currentPeriodEnd: { gte: new Date() },
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const planSlug = activeSub?.plan?.slug?.toUpperCase() || "STARTER";
    const planTier = planSlug.includes("SCALE")
      ? "SCALE"
      : planSlug.includes("GROWTH")
      ? "GROWTH"
      : "STARTER";

    // 2. Fetch all registered Marketplace Services
    const allServices = await prisma.marketplaceService.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    // 3. Fetch existing activations for this tenant
    const activations = await prisma.organizationServiceActivation.findMany({
      where: { tenantId },
    });

    const activationMap = new Map(activations.map((a) => [a.serviceId, a]));

    // 4. Calculate dynamic lifecycle state for every service
    const enrichedServices = allServices.map((svc) => {
      const act = activationMap.get(svc.id);

      // Check tier restriction:
      // If service requires GROWTH but tenant is on STARTER (and not grandfathered active)
      const isTierRestricted =
        svc.requiredPlanTier === "SCALE"
          ? planTier !== "SCALE"
          : svc.requiredPlanTier === "GROWTH"
          ? planTier === "STARTER"
          : false;

      let lifecycleStatus: string = "AVAILABLE";

      if (svc.implementationStatus === "PLANNED") {
        lifecycleStatus = "PLANNED";
      } else if (act) {
        lifecycleStatus = act.status; // "ACTIVE", "CONFIGURATION_REQUIRED", "DEACTIVATED", "SUSPENDED"
      } else if (isTierRestricted) {
        lifecycleStatus = "RESTRICTED";
      } else {
        lifecycleStatus = "AVAILABLE";
      }

      return {
        id: svc.id,
        name: svc.name,
        category: svc.category,
        description: svc.description,
        iconName: svc.iconName,
        badge: svc.badge,
        implementationStatus: svc.implementationStatus,
        requiredPlanTier: svc.requiredPlanTier,
        targetRoute: svc.targetRoute,
        configRoute: svc.configRoute,
        isCoreDefault: svc.isCoreDefault,
        lifecycleStatus,
        isRestricted: isTierRestricted && (!act || act.status === "DEACTIVATED"),
        activatedAt: act?.activatedAt || null,
        applicableOutletId: act?.applicableOutletId || null,
      };
    });

    // Count non-core active add-ons
    const activeAddonsCount = enrichedServices.filter(
      (s) => (s.lifecycleStatus === "ACTIVE" || s.lifecycleStatus === "CONFIGURATION_REQUIRED") && !s.isCoreDefault
    ).length;

    const allowedAddonsLimit = planTier === "SCALE" ? 999 : planTier === "GROWTH" ? 5 : 0;

    return NextResponse.json({
      services: enrichedServices,
      totalCount: enrichedServices.length,
      planTier,
      planName: activeSub?.plan?.name || "Starter Plan",
      activeAddonsCount,
      allowedAddonsLimit,
      isOwnerOrManager,
      tenantId,
    });
  } catch (error: any) {
    console.error("[Marketplace GET] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load marketplace catalog" },
      { status: 500 }
    );
  }
}
