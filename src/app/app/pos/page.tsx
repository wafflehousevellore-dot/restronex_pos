export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { redirect } from "next/navigation";
import POSClient from "@/components/app/POSClient";
import { getEntitlements } from "@/lib/entitlements";

export default async function POSPage(){
  const { userId } = await getSession();
  if(!userId) redirect("/sign-in?next=/app/pos");
  const tenantId = await resolveTenantId(userId);
  if(!tenantId) redirect("/app/onboarding");
  // Enforce entitlements server-side — do not trust browser, enforce tenant isolation
  const ent = await getEntitlements(tenantId);
  if (!ent.hasActiveSubscription) {
    redirect(`/checkout?reason=subscription_required`);
  }
  // Block POS access if onboarding is incomplete
  const tenant = await prisma.tenant.findUnique({ where:{ id: tenantId }});
  if (!tenant || !tenant.onboardingComplete) {
    redirect("/app/onboarding");
  }
  const [outlets, tables, menuItems] = await Promise.all([
    prisma.outlet.findMany({ where:{ tenantId }, orderBy:{ createdAt:"asc" }}),
    prisma.table.findMany({ where:{ tenantId }, orderBy:{ number:"asc" }}),
    prisma.menuItem.findMany({ where:{ tenantId, isActive:true }, include:{ category:true }, orderBy:{ name:"asc" }}),
  ]);
  const items = menuItems.map(m=> ({
    id: m.id,
    name: m.name,
    pricePaise: m.pricePaise,
    categoryId: m.categoryId,
    isVeg: m.isVeg,
    imageUrl: m.imageUrl,
    description: m.description,
    isSoldOut: m.isSoldOut,
    category: m.category ? { name: m.category.name } : undefined,
  }));
  const tableData = tables.map(t=> ({
    id: t.id,
    number: t.number,
    status: t.status,
    area: t.area,
    currentOrderId: t.currentOrderId,
    orderTotalPaise: t.orderTotalPaise,
  }));
  const outletData = outlets.map(o=> ({ id:o.id, name:o.name }));
  return <POSClient initialItems={items} initialTables={tableData} initialOutlets={outletData} />;
}
