import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logPlatformAdminAction, requirePlatformPermissionApi } from "@/lib/platform-auth";

export async function GET(req: NextRequest) {
  const guard = await requirePlatformPermissionApi("platform.organizations.view");
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.toLowerCase() || "";
  const status = url.searchParams.get("status");
  const planSlug = url.searchParams.get("planSlug");

  const tenants = await prisma.tenant.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { slug: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      outlets: {
        orderBy: { createdAt: "asc" },
      },
      subscriptions: {
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      },
      memberships: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      _count: {
        select: {
          memberships: true,
          orders: true,
          outlets: true,
        },
      },
    },
  });

  const filtered = planSlug && planSlug !== "ALL"
    ? tenants.filter((t) => t.subscriptions[0]?.plan?.slug === planSlug)
    : tenants;

  return NextResponse.json({ tenants: filtered });
}

export async function PATCH(req: NextRequest) {
  const guard = await requirePlatformPermissionApi("platform.organizations.manage");
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const { action, tenantId, outletId, status, onboardingComplete, reason } = body as {
      action: "UPDATE_TENANT" | "UPDATE_OUTLET" | "SUSPEND_TENANT" | "REACTIVATE_TENANT";
      tenantId?: string;
      outletId?: string;
      status?: string;
      onboardingComplete?: boolean;
      reason?: string;
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
          reason: reason || "Administrative update",
        },
      });

      return NextResponse.json({ ok: true, outlet: updatedOutlet });
    }

    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const targetStatus =
      action === "SUSPEND_TENANT"
        ? "SUSPENDED"
        : action === "REACTIVATE_TENANT"
        ? "ACTIVE"
        : status;

    const allowedTenantStatuses = ["ACTIVE", "SUSPENDED"];
    if (targetStatus && !allowedTenantStatuses.includes(targetStatus)) {
      return NextResponse.json({ error: "Invalid organization status" }, { status: 400 });
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(targetStatus ? { status: targetStatus } : {}),
        ...(typeof onboardingComplete === "boolean" ? { onboardingComplete } : {}),
      },
    });

    await logPlatformAdminAction({
      userId: guard.auth.user.id,
      tenantId: tenant.id,
      action: action === "SUSPEND_TENANT" ? "PLATFORM_ORGANIZATION_SUSPENDED" : action === "REACTIVATE_TENANT" ? "PLATFORM_ORGANIZATION_REACTIVATED" : "PLATFORM_TENANT_UPDATED",
      entity: "Tenant",
      entityId: tenant.id,
      metadata: {
        tenantName: tenant.name,
        previousStatus: tenant.status,
        newStatus: updatedTenant.status,
        reason: reason || "Administrative update",
        onboardingComplete: updatedTenant.onboardingComplete,
      },
    });

    return NextResponse.json({ ok: true, tenant: updatedTenant });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
  }
}
