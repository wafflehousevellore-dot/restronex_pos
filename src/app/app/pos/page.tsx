export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { redirect } from "next/navigation";
import POSClient from "@/components/app/POSClient";
import { getEntitlements } from "@/lib/entitlements";
import { pricingPlans } from "@/lib/brand";
import { ensureSeedPlans } from "@/lib/seed";
import Link from "next/link";

export default async function POSPage(){
  const { userId } = await getSession();
  if(!userId) redirect("/sign-in?next=/app/pos");
  const tenantId = await resolveTenantId(userId);
  if(!tenantId) redirect("/app/onboarding");

  // Enforce entitlements server-side — do not trust browser, enforce tenant isolation
  const ent = await getEntitlements(tenantId);
  const tenant = await prisma.tenant.findUnique({ where:{ id: tenantId }});

  // If no active subscription on this tenant, render an informative In-App Card instead of an abrupt redirect
  if (!ent.hasActiveSubscription) {
    await ensureSeedPlans();
    const dbPlans = await prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } });
    const starterPlan = dbPlans.find((p) => p.slug === "starter");
    const growthPlan = dbPlans.find((p) => p.slug === "growth");
    const starterRupees = starterPlan
      ? Math.round(starterPlan.priceMonthlyPaise / 100)
      : pricingPlans[0].priceMonthly;
    const growthRupees = growthPlan
      ? Math.round(growthPlan.priceMonthlyPaise / 100)
      : pricingPlans[1].priceMonthly;

    const otherActiveMemberships = await prisma.membership.findMany({
      where: {
        userId,
        tenantId: { not: tenantId },
        tenant: {
          subscriptions: {
            some: { status: "ACTIVE", currentPeriodEnd: { gte: new Date() } }
          }
        }
      },
      include: {
        tenant: {
          include: {
            subscriptions: {
              where: { status: "ACTIVE", currentPeriodEnd: { gte: new Date() } },
              include: { plan: true }
            }
          }
        }
      }
    });

    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6 text-[#172B25]">
        <div className="rounded-3xl border border-[#E5EBE7] bg-white p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1 text-xs font-semibold text-amber-900 mb-4">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Subscription Required for POS
          </div>
          <h1 className="text-2xl font-black text-[#172B25] tracking-tight">
            Activate POS Billing for {tenant?.name || "this Organization"}
          </h1>
          <p className="mt-2 text-sm text-[#718078] leading-relaxed">
            Live billing, KOT generation, and table ordering require an active restaurant plan. Choose a plan below to activate your POS terminal instantly.
          </p>

          {otherActiveMemberships.length > 0 && (
            <div className="mt-6 rounded-2xl border border-[#16845B]/20 bg-[#E8F5EE] p-4">
              <div className="text-xs font-bold text-[#16845B] uppercase tracking-wider">
                Active Organization Available
              </div>
              <p className="text-xs text-[#172B25] mt-1">
                You already have an active subscription for <b>{otherActiveMemberships[0].tenant.name}</b> ({otherActiveMemberships[0].tenant.subscriptions[0]?.plan?.name || "Active"} Plan).
              </p>
              <div className="mt-3">
                <Link
                  href="/app/organization"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#16845B] px-5 py-2 text-xs font-bold text-white hover:bg-[#116B49] shadow-xs transition"
                >
                  Switch to {otherActiveMemberships[0].tenant.name} →
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border-2 border-[#16845B] bg-white p-5 shadow-xs relative">
              <span className="absolute -top-2.5 right-4 rounded-full bg-[#16845B] text-white text-[10px] font-bold px-2.5 py-0.5">
                RECOMMENDED
              </span>
              <div className="text-xs font-bold uppercase tracking-wider text-[#718078]">Growth Plan</div>
              <div className="text-2xl font-black text-[#172B25] mt-1">₹{growthRupees} <span className="text-xs font-normal text-[#718078]">/ month + GST</span></div>
              <p className="text-xs text-[#718078] mt-2">Up to 5 outlets • 25 staff accounts • Inventory • Advanced reports</p>
              <Link
                href="/checkout?plan=growth&cycle=MONTHLY"
                className="mt-4 block w-full rounded-xl bg-[#16845B] py-2.5 text-center text-xs font-bold text-white hover:bg-[#116B49] shadow-xs transition"
              >
                Subscribe to Growth →
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-5 shadow-2xs">
              <div className="text-xs font-bold uppercase tracking-wider text-[#718078]">Starter Plan</div>
              <div className="text-2xl font-black text-[#172B25] mt-1">₹{starterRupees} <span className="text-xs font-normal text-[#718078]">/ month + GST</span></div>
              <p className="text-xs text-[#718078] mt-2">1 outlet • 5 staff • Core POS billing • Essential reports</p>
              <Link
                href="/checkout?plan=starter&cycle=MONTHLY"
                className="mt-4 block w-full rounded-xl border border-[#E5EBE7] bg-white py-2.5 text-center text-xs font-bold text-[#172B25] hover:bg-[#F8FAF9] shadow-2xs transition"
              >
                Subscribe to Starter →
              </Link>
            </div>
          </div>

          {!tenant?.onboardingComplete && (
            <div className="mt-6 pt-6 border-t border-[#E5EBE7] flex items-center justify-between text-xs text-[#718078]">
              <span>Setting up your restaurant details?</span>
              <Link href="/app/onboarding" className="font-bold text-[#16845B] hover:underline">
                Continue 8-Step Onboarding →
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Block POS access if onboarding is incomplete
  if (!tenant || !tenant.onboardingComplete) {
    redirect("/app/onboarding");
  }
  const [outlets, tables, menuItems] = await Promise.all([
    prisma.outlet.findMany({ where:{ tenantId }, orderBy:{ createdAt:"asc" }}),
    prisma.table.findMany({ where:{ tenantId }, orderBy:{ number:"asc" }}),
    prisma.menuItem.findMany({
      where: { tenantId, isActive: true },
      include: {
        category: true,
        addonLinks: {
          where: { isActive: true },
          include: {
            addonGroup: {
              include: {
                options: {
                  where: { isActive: true },
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
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
    addonLinks: m.addonLinks,
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
