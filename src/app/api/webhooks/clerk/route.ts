import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);
    const eventType = evt.type as string;
    console.log(`[clerk webhook] ${eventType} id=${(evt.data as any)?.id}`);

    // Organization events -> Tenant sync
    if (eventType === "organization.created" || eventType === "organization.updated") {
      const org = evt.data as any;
      const orgId = org.id as string;
      const name = org.name as string;
      const slugBase = (org.slug as string) || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      let tenant = await prisma.tenant.findUnique({ where: { clerkOrgId: orgId } });
      if (!tenant) {
        const slug = slugBase + "-" + Math.random().toString(36).slice(2, 6);
        tenant = await prisma.tenant.create({
          data: {
            clerkOrgId: orgId,
            name: name || "My Restaurant",
            slug,
            businessType: "Restaurant",
            email: org.created_by ? "" : "owner@clerk.local",
            phone: "+91 90000 00000",
          },
        });
        await prisma.restaurantSetting.create({ data: { tenantId: tenant.id, receiptHeader: tenant.name } });
        await prisma.taxConfig.createMany({ data: [{ tenantId: tenant.id, name: "CGST", rateBps: 900 }, { tenantId: tenant.id, name: "SGST", rateBps: 900 }] });
        // seed minimal outlet for onboarding jump
        const outlet = await prisma.outlet.create({ data: { tenantId: tenant.id, name: `${tenant.name} — Main`, slug: "main-" + slug.slice(0, 8), address: "Bengaluru", city: "Bengaluru", phone: "+91 90000 00000" } });
        for (let i = 1; i <= 6; i++) await prisma.table.create({ data: { tenantId: tenant.id, outletId: outlet.id, number: `T${String(i).padStart(2, "0")}`, capacity: 4 } });
        await prisma.auditLog.create({ data: { tenantId: tenant.id, action: "TENANT_CREATED_VIA_CLERK_WEBHOOK", entity: "Tenant", entityId: tenant.id, metadataJson: JSON.stringify({ orgId, name }) } });
      } else {
        await prisma.tenant.update({ where: { id: tenant.id }, data: { name, slug: slugBase } });
      }
    }

    if (eventType === "organization.deleted") {
      const org = evt.data as any;
      const orgId = org.id as string;
      const tenant = await prisma.tenant.findUnique({ where: { clerkOrgId: orgId } });
      if (tenant) {
        await prisma.tenant.update({ where: { id: tenant.id }, data: { status: "DELETED" } });
        await prisma.auditLog.create({ data: { tenantId: tenant.id, action: "TENANT_DELETED_VIA_CLERK", entity: "Tenant", entityId: tenant.id, metadataJson: JSON.stringify({ orgId }) } });
      }
    }

    if (eventType === "organizationMembership.created" || eventType === "organizationMembership.updated") {
      const m = evt.data as any;
      const orgId = m.organization?.id || m.organization_id;
      const clerkUserId = m.public_user_data?.user_id || m.user_id;
      const role = (m.role as string) || "org:member";
      const mappedRole = role === "org:admin" ? "OWNER" : role === "org:member" ? "STAFF" : "STAFF";
      if (orgId && clerkUserId) {
        const tenant = await prisma.tenant.findUnique({ where: { clerkOrgId: orgId } });
        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
        if (tenant && user) {
          const existing = await prisma.membership.findFirst({ where: { userId: user.id, tenantId: tenant.id } });
          if (!existing) await prisma.membership.create({ data: { userId: user.id, tenantId: tenant.id, role: mappedRole } });
          else await prisma.membership.update({ where: { id: existing.id }, data: { role: mappedRole } });
        }
      }
    }

    if (eventType === "organizationMembership.deleted") {
      const m = evt.data as any;
      const orgId = m.organization?.id || m.organization_id;
      const clerkUserId = m.public_user_data?.user_id || m.user_id;
      if (orgId && clerkUserId) {
        const tenant = await prisma.tenant.findUnique({ where: { clerkOrgId: orgId } });
        const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
        if (tenant && user) {
          await prisma.membership.deleteMany({ where: { userId: user.id, tenantId: tenant.id } });
        }
      }
    }

    // User events - keep email/name in sync
    if (eventType === "user.created" || eventType === "user.updated") {
      const u = evt.data as any;
      const clerkUserId = u.id as string;
      const email = u.email_addresses?.[0]?.email_address as string;
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || email?.split("@")[0] || "User";
      let user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
      if (!user && email) user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        await prisma.user.create({ data: { clerkId: clerkUserId, email: email || `${clerkUserId}@clerk.local`, name, avatarUrl: u.image_url } });
      } else if (!user.clerkId) {
        await prisma.user.update({ where: { id: user.id }, data: { clerkId: clerkUserId, name, avatarUrl: u.image_url } });
      } else {
        await prisma.user.update({ where: { id: user.id }, data: { name, avatarUrl: u.image_url, email: email || user.email } });
      }
    }

    return NextResponse.json({ ok: true, eventType });
  } catch (err: any) {
    console.error("[clerk webhook] verification failed", err?.message);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }
}
