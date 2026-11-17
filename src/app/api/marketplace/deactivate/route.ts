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

    const { serviceId } = body;
    if (!serviceId) {
      return NextResponse.json({ error: "Missing serviceId parameter" }, { status: 400 });
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

    if (!isOwnerOrManager) {
      return NextResponse.json(
        { error: "Insufficient permissions. Only Restaurant Owners and Managers can modify marketplace services." },
        { status: 403 }
      );
    }

    const service = await prisma.marketplaceService.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      return NextResponse.json({ error: `Service "${serviceId}" not found in catalog` }, { status: 404 });
    }

    if (service.isCoreDefault) {
      return NextResponse.json(
        {
          error: `"${service.name}" is a core POS operating module essential for restaurant billing and cannot be disabled.`,
        },
        { status: 400 }
      );
    }

    // Update activation status to DEACTIVATED
    const activation = await prisma.organizationServiceActivation.update({
      where: {
        tenantId_serviceId: {
          tenantId,
          serviceId,
        },
      },
      data: {
        status: "DEACTIVATED",
        deactivatedAt: new Date(),
      },
    });

    // Audit logs
    await prisma.serviceActivationEvent.create({
      data: {
        tenantId,
        serviceId,
        eventType: "DEACTIVATED",
        actorUserId: userId,
        actorEmail: user?.email || null,
        detailsJson: JSON.stringify({ deactivatedAt: new Date() }),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "MARKETPLACE_SERVICE_DEACTIVATED",
        entity: "MarketplaceService",
        entityId: serviceId,
        metadataJson: JSON.stringify({ details: `Deactivated service "${service.name}"` }),
      },
    });

    return NextResponse.json({
      ok: true,
      serviceId,
      name: service.name,
      status: activation.status,
      message: `"${service.name}" has been deactivated.`,
    });
  } catch (error: any) {
    console.error("[Marketplace Deactivate] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to deactivate service" },
      { status: 500 }
    );
  }
}
