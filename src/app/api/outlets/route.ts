import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId, getActiveOrgId } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { appCache } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) {
    tenantId = await getActiveOrgId();
  }

  let tenantIds: string[] = [];
  if (tenantId) {
    const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
    if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    tenantIds = [tenantId];
  } else {
    const memberships = await prisma.membership.findMany({ where: { userId } });
    tenantIds = memberships.map((m) => m.tenantId);
    if (tenantIds.length === 0) return NextResponse.json([]);
  }

  const primaryTenantId = tenantIds[0];

  // Fetch outlets with counts and recent sales
  const [outlets, ordersAgg, ent] = await Promise.all([
    prisma.outlet.findMany({
      where: { tenantId: { in: tenantIds } },
      include: {
        tables: { select: { id: true } },
        memberships: { select: { id: true } },
        outletMembers: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.groupBy({
      by: ["outletId"],
      where: {
        tenantId: { in: tenantIds },
        status: { in: ["COMPLETED", "BILLED", "SERVED", "OPEN"] },
      },
      _count: { id: true },
      _sum: { totalPaise: true },
    }),
    primaryTenantId ? getEntitlements(primaryTenantId) : null,
  ]);

  // Map aggregates
  const aggMap = new Map<string, { orderCount: number; revenuePaise: number }>();
  ordersAgg.forEach((ag) => {
    aggMap.set(ag.outletId, {
      orderCount: ag._count.id || 0,
      revenuePaise: ag._sum.totalPaise || 0,
    });
  });

  const enrichedOutlets = outlets.map((o) => {
    const stats = aggMap.get(o.id) || { orderCount: 0, revenuePaise: 0 };
    const staffCount = o.memberships.length + o.outletMembers.length;
    const aovPaise = stats.orderCount > 0 ? Math.round(stats.revenuePaise / stats.orderCount) : 0;

    return {
      id: o.id,
      tenantId: o.tenantId,
      name: o.name,
      slug: o.slug,
      address: o.address,
      city: o.city,
      phone: o.phone,
      status: o.status,
      serviceModes: o.serviceModes,
      openingHours: o.openingHours,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      tableCount: o.tables.length,
      staffCount,
      orderCount: stats.orderCount,
      revenuePaise: stats.revenuePaise,
      aovPaise,
    };
  });

  // Calculate Head Office Analytics
  const totalRevenuePaise = enrichedOutlets.reduce((acc, o) => acc + o.revenuePaise, 0);
  const totalOrders = enrichedOutlets.reduce((acc, o) => acc + o.orderCount, 0);
  const averageOrderValuePaise = totalOrders > 0 ? Math.round(totalRevenuePaise / totalOrders) : 0;
  const activeOutlets = enrichedOutlets.filter((o) => o.status === "ACTIVE").length;
  const inactiveOutlets = enrichedOutlets.filter((o) => o.status === "INACTIVE").length;

  // Best & lowest performing
  const sortedByRevenue = [...enrichedOutlets].sort((a, b) => b.revenuePaise - a.revenuePaise);
  const bestPerformingOutlet = sortedByRevenue[0] || null;
  const lowestPerformingOutlet = sortedByRevenue[sortedByRevenue.length - 1] || null;

  return NextResponse.json({
    outlets: enrichedOutlets,
    analytics: {
      totalOutlets: enrichedOutlets.length,
      activeOutlets,
      inactiveOutlets,
      totalRevenuePaise,
      totalOrders,
      averageOrderValuePaise,
      bestPerformingOutlet: bestPerformingOutlet ? { name: bestPerformingOutlet.name, revenuePaise: bestPerformingOutlet.revenuePaise } : null,
      lowestPerformingOutlet: lowestPerformingOutlet ? { name: lowestPerformingOutlet.name, revenuePaise: lowestPerformingOutlet.revenuePaise } : null,
      maxOutlets: ent?.maxOutlets || 1,
      planName: ent?.planName || "Starter",
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem || !["OWNER", "HEAD_OFFICE"].includes(mem.role)) {
    return NextResponse.json({ error: "Only restaurant owners or head office admins can create outlets" }, { status: 403 });
  }

  // Strict Plan-based outlet limit enforcement:
  const ent = await getEntitlements(tenantId);
  const currentCount = await prisma.outlet.count({ where: { tenantId, status: "ACTIVE" } });

  if (currentCount >= ent.maxOutlets) {
    return NextResponse.json(
      {
        error: `OUTLET_LIMIT_REACHED: Your ${ent.planName || "Starter"} plan permits a maximum of ${ent.maxOutlets} active outlet(s). Upgrade your subscription to add more branches.`,
        code: "OUTLET_LIMIT_EXCEEDED",
        maxOutlets: ent.maxOutlets,
        currentCount,
        upgradeUrl: "/checkout?change=true&plan=growth",
      },
      { status: 403 }
    );
  }

  const slug =
    body.slug ||
    body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") +
      "-" +
      Math.random().toString(36).slice(2, 5);

  const outlet = await prisma.outlet.create({
    data: {
      tenantId,
      name: body.name.trim(),
      slug,
      address: body.address?.trim() || "",
      city: body.city?.trim() || "Bengaluru",
      phone: body.phone?.trim() || "",
      serviceModes: body.serviceModes || "DINE_IN,TAKEAWAY,DELIVERY",
      openingHours: body.openingHours?.trim() || "11:00 AM - 11:00 PM",
      status: "ACTIVE",
    },
  });

  appCache.delPrefix(`outlets_${tenantId}`);

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "OUTLET_CREATED",
      entity: "Outlet",
      entityId: outlet.id,
      metadataJson: JSON.stringify({ name: outlet.name, city: outlet.city }),
    },
  });

  return NextResponse.json({ ok: true, outlet });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const { outletId, name, address, city, phone, serviceModes, openingHours, status } = body;
  if (!outletId) return NextResponse.json({ error: "outletId required" }, { status: 400 });

  const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
  if (!outlet) return NextResponse.json({ error: "Outlet not found" }, { status: 404 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId: outlet.tenantId } });
  if (!mem || !["OWNER", "HEAD_OFFICE"].includes(mem.role)) {
    return NextResponse.json({ error: "Forbidden: Owner or Head Office role required" }, { status: 403 });
  }

  // If activating an inactive outlet, verify plan limit
  if (status === "ACTIVE" && outlet.status !== "ACTIVE") {
    const ent = await getEntitlements(outlet.tenantId);
    const activeCount = await prisma.outlet.count({
      where: { tenantId: outlet.tenantId, status: "ACTIVE" },
    });
    if (activeCount >= ent.maxOutlets) {
      return NextResponse.json(
        {
          error: `Cannot activate branch. Your ${ent.planName} plan limit is ${ent.maxOutlets} active outlets.`,
        },
        { status: 403 }
      );
    }
  }

  const updateData: any = {};
  if (name) updateData.name = name.trim();
  if (address !== undefined) updateData.address = address.trim();
  if (city !== undefined) updateData.city = city.trim();
  if (phone !== undefined) updateData.phone = phone.trim();
  if (serviceModes !== undefined) updateData.serviceModes = serviceModes;
  if (openingHours !== undefined) updateData.openingHours = openingHours.trim();
  if (status !== undefined) updateData.status = status;

  const updated = await prisma.outlet.update({
    where: { id: outletId },
    data: updateData,
  });

  appCache.delPrefix(`outlets_${outlet.tenantId}`);

  await prisma.auditLog.create({
    data: {
      tenantId: outlet.tenantId,
      userId,
      action: "OUTLET_UPDATED",
      entity: "Outlet",
      entityId: outlet.id,
      metadataJson: JSON.stringify(updateData),
    },
  });

  return NextResponse.json({ ok: true, outlet: updated });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const outletId = req.nextUrl.searchParams.get("outletId");
  if (!outletId) return NextResponse.json({ error: "outletId required" }, { status: 400 });

  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    include: {
      orders: { where: { status: { in: ["OPEN", "PLACED", "PREPARING", "READY"] } } },
    },
  });
  if (!outlet) return NextResponse.json({ error: "Outlet not found" }, { status: 404 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId: outlet.tenantId } });
  if (!mem || mem.role !== "OWNER") {
    return NextResponse.json({ error: "Only the business owner can delete or decommission an outlet" }, { status: 403 });
  }

  if (outlet.orders.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete branch with active running orders. Please close or complete open orders first." },
      { status: 400 }
    );
  }

  // Soft archive to preserve all historical financial and audit data
  const updated = await prisma.outlet.update({
    where: { id: outletId },
    data: { status: "INACTIVE" },
  });

  appCache.delPrefix(`outlets_${outlet.tenantId}`);

  await prisma.auditLog.create({
    data: {
      tenantId: outlet.tenantId,
      userId,
      action: "OUTLET_DEACTIVATED",
      entity: "Outlet",
      entityId: outlet.id,
      metadataJson: JSON.stringify({ name: outlet.name }),
    },
  });

  return NextResponse.json({ ok: true, outlet: updated, deactivated: true });
}
