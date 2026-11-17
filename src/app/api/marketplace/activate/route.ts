import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId, user } = await getSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { serviceId, outletId, config } = body;
    if (!serviceId) {
      return NextResponse.json({ error: "Missing serviceId parameter" }, { status: 400 });
    }

    const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
    if (!tenantId) {
      return NextResponse.json({ error: "No active restaurant organization context" }, { status: 400 });
    }

    // Role check: Only Owner, Org Admin, or Outlet Manager may activate modules
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

    if (!isOwnerOrManager) {
      return NextResponse.json(
        { error: "Insufficient permissions. Only Restaurant Owners and Managers can activate marketplace modules." },
        { status: 403 }
      );
    }

    // 1. Verify service exists in catalog
    const service = await prisma.marketplaceService.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      return NextResponse.json({ error: `Service "${serviceId}" not found in marketplace catalog` }, { status: 404 });
    }

    if (service.implementationStatus === "PLANNED") {
      return NextResponse.json(
        {
          error: `"${service.name}" is an enterprise roadmap module currently under development. You can register for early beta access from support.`,
        },
        { status: 400 }
      );
    }

    // 2. Subscription Entitlement Verification
    const activeSub = await prisma.subscription.findFirst({
      where: {
        tenantId,
        status: "ACTIVE",
        currentPeriodEnd: { gte: new Date() },
      },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });

    const planSlug = activeSub?.plan?.slug?.toUpperCase() || "STARTER";
    const planTier = planSlug.includes("SCALE")
      ? "SCALE"
      : planSlug.includes("GROWTH")
      ? "GROWTH"
      : "STARTER";

    if (service.requiredPlanTier === "SCALE" && planTier !== "SCALE") {
      return NextResponse.json(
        {
          error: `"${service.name}" requires the RestroNex Scale subscription plan. Your current plan is ${activeSub?.plan?.name || "Starter"}.`,
          requiresUpgrade: true,
          upgradeRoute: "/app/subscription",
        },
        { status: 403 }
      );
    }

    if (service.requiredPlanTier === "GROWTH" && planTier === "STARTER") {
      return NextResponse.json(
        {
          error: `"${service.name}" requires a Growth or Scale subscription plan. Please upgrade to activate this add-on.`,
          requiresUpgrade: true,
          upgradeRoute: "/app/subscription",
        },
        { status: 403 }
      );
    }

    // Growth Tier Quota: Max 5 non-core add-ons
    if (planTier === "GROWTH" && !service.isCoreDefault) {
      const activeNonCoreCount = await prisma.organizationServiceActivation.count({
        where: {
          tenantId,
          status: { in: ["ACTIVE", "CONFIGURATION_REQUIRED"] },
          service: { isCoreDefault: false },
          NOT: { serviceId },
        },
      });

      if (activeNonCoreCount >= 5) {
        return NextResponse.json(
          {
            error: "Growth Plan quota reached (5 non-core add-ons). Please deactivate an existing add-on or upgrade to Scale for unlimited modules.",
            quotaExceeded: true,
            upgradeRoute: "/app/subscription",
          },
          { status: 403 }
        );
      }
    }

    // 3. Determine target activation state
    const targetStatus =
      service.implementationStatus === "CONFIG_REQUIRED" && !config
        ? "CONFIGURATION_REQUIRED"
        : "ACTIVE";

    // 4. Idempotent Upsert of OrganizationServiceActivation
    const activation = await prisma.organizationServiceActivation.upsert({
      where: {
        tenantId_serviceId: {
          tenantId,
          serviceId,
        },
      },
      create: {
        tenantId,
        serviceId,
        status: targetStatus,
        applicableOutletId: outletId || null,
        configJson: config ? JSON.stringify(config) : null,
        activatedAt: new Date(),
        activatedByUserId: userId,
        deactivatedAt: null,
      },
      update: {
        status: targetStatus,
        applicableOutletId: outletId || undefined,
        configJson: config ? JSON.stringify(config) : undefined,
        deactivatedAt: null,
      },
    });

    // 5. Audit Log and Event Dispatch
    await prisma.serviceActivationEvent.create({
      data: {
        tenantId,
        serviceId,
        eventType: "ACTIVATED",
        actorUserId: userId,
        actorEmail: user?.email || null,
        detailsJson: JSON.stringify({
          planTier,
          status: targetStatus,
          outletId: outletId || "ALL_OUTLETS",
        }),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "MARKETPLACE_SERVICE_ACTIVATED",
        entity: "MarketplaceService",
        entityId: serviceId,
        metadataJson: JSON.stringify({ details: `Activated service "${service.name}" with status ${targetStatus}` }),
      },
    });

    return NextResponse.json({
      ok: true,
      serviceId,
      name: service.name,
      status: activation.status,
      targetRoute: service.targetRoute,
      configRoute: service.configRoute,
      message:
        activation.status === "CONFIGURATION_REQUIRED"
          ? `"${service.name}" added successfully. Initial configuration is required before use.`
          : `"${service.name}" is now active and ready for your restaurant.`,
    });
  } catch (error: any) {
    console.error("[Marketplace Activate] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to activate service" },
      { status: 500 }
    );
  }
}
