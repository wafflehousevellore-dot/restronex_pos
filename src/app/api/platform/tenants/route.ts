import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logPlatformAdminAction, requirePlatformOwnerApi } from "@/lib/platform-auth";

export async function GET() {
  const guard = await requirePlatformOwnerApi();
  if (!guard.ok) return guard.response;

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      outlets: {
        orderBy: { createdAt: "asc" },
      },
      subscriptions: {
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          memberships: true,
          orders: true,
        },
      },
    },
  });

  return NextResponse.json({ tenants });
}

export async function PATCH(req: NextRequest) {
  const guard = await requirePlatformOwnerApi();
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const { action, tenantId, outletId, status, onboardingComplete } = body as {
      action: "UPDATE_TENANT" | "UPDATE_OUTLET";
      tenantId?: string;
      outletId?: string;
      status?: string;
      onboardingComplete?: boolean;
    };

    if (action === "UPDATE_OUTLET") {
      if (!outletId) return NextResponse.json({ error: "outletId required" }, { status: 400 });
      const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
      if (!outlet) return NextResponse.json({ error: "Outlet not found" }, { status: 404 });

      const allowedOutletStatuses = ["ACTIVE", "INACTIVE"];
      if (status && !allowedOutletStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid outlet status" }, { status: 400 });
      }

      const updatedOutlet = await prisma.outlet.update({
        where: { id: outletId },
        data: {
          ...(status ? { status } : {}),
        },
      });

      await logPlatformAdminAction({
        userId: guard.auth.user.id,
        tenantId: outlet.tenantId,
        action: "PLATFORM_OUTLET_UPDATED",
        entity: "Outlet",
        entityId: outlet.id,
        metadata: {
          outletName: outlet.name,
          previousStatus: outlet.status,
          newStatus: updatedOutlet.status,
        },
      });

      return NextResponse.json({ ok: true, outlet: updatedOutlet });
    }

    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const allowedTenantStatuses = ["ACTIVE", "SUSPENDED"];
    if (status && !allowedTenantStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid organization status" }, { status: 400 });
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(status ? { status } : {}),
        ...(typeof onboardingComplete === "boolean" ? { onboardingComplete } : {}),
      },
    });

    await logPlatformAdminAction({
      userId: guard.auth.user.id,
      tenantId: tenant.id,
      action: "PLATFORM_TENANT_UPDATED",
      entity: "Tenant",
      entityId: tenant.id,
      metadata: {
        tenantName: tenant.name,
        previousStatus: tenant.status,
        newStatus: updatedTenant.status,
        onboardingComplete: updatedTenant.onboardingComplete,
      },
    });

    return NextResponse.json({ ok: true, tenant: updatedTenant });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
  }
}
