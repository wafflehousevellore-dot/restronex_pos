import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { PageShell } from "@/components/marketing/PageShell";
import CheckoutClient from "./CheckoutClient";
import { calcCheckoutTotals, getPlanBySlug } from "@/lib/checkout";
import { isRazorpayConfigured, isWebhookConfigured } from "@/lib/razorpay";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams;
  const { userId } = await getSession();
  const c = await cookies();
  const persisted = c.get("restronex_checkout")?.value ? (()=>{ try{return JSON.parse(decodeURIComponent(c.get("restronex_checkout")!.value))}catch{return null} })() : null;
  const rawCookiePlan = c.get("restronex_plan")?.value ? (()=>{ try{return decodeURIComponent(c.get("restronex_plan")!.value)}catch{return null} })() : null;
  const cookiePlan = rawCookiePlan && rawCookiePlan !== "undefined" && rawCookiePlan !== "null" ? rawCookiePlan : null;
  
  let candidatePlan = sp.plan || persisted?.planSlug || cookiePlan || "growth";
  if (!getPlanBySlug(candidatePlan)) {
    candidatePlan = "growth";
  }
  const planSlug = candidatePlan;
  const billingCycle = (sp.cycle === "ANNUAL" || sp.cycle === "MONTHLY" ? sp.cycle : null) || (persisted?.billingCycle === "ANNUAL" || persisted?.billingCycle === "MONTHLY" ? persisted.billingCycle : null) || "MONTHLY";
  const outletCount = parseInt(sp.outlets || persisted?.outletCount || "1", 10) || 1;

  let totals;
  try {
    totals = calcCheckoutTotals({ planSlug, billingCycle, outletCount });
  } catch {
    totals = calcCheckoutTotals({ planSlug: "growth", billingCycle: "MONTHLY", outletCount: 1 });
  }

  const razorConfigured = isRazorpayConfigured();
  const webhookConfigured = isWebhookConfigured();

  // If already paid and subscription is active on CURRENT ACTIVE TENANT, do not prompt payment again
  let tenantId: string | null = null;
  let hasTenant = false;
  if (userId) {
    tenantId = await resolveTenantId(userId);
    let activeSub: any = null;
    let tenantOnboardingComplete = false;

    if (tenantId) {
      const activeTenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          subscriptions: {
            where: { status: "ACTIVE", currentPeriodEnd: { gte: new Date() } },
            include: { plan: true },
          },
        },
      });
      activeSub = activeTenant?.subscriptions?.[0] || null;
      tenantOnboardingComplete = !!activeTenant?.onboardingComplete;
    }

    hasTenant = !!tenantId;

    // Never auto-redirect to /app/pos if the user specifically arrived due to subscription_required
    if (activeSub && sp.renew !== "true" && sp.change !== "true" && sp.reason !== "subscription_required") {
      if (tenantOnboardingComplete) {
        redirect("/app/pos");
      } else {
        redirect("/app/onboarding");
      }
    }
  }

  return (
    <PageShell
      title="Secure Checkout"
      subtitle={`Subscription checkout for RestroNex • ${totals.plan.name} • ${billingCycle} • GST 18% • Razorpay ${razorConfigured ? "live" : "test/simulated"} • Webhook ${webhookConfigured ? "verified" : "demo mode"}`}
      badge="Checkout • Taxes • Razorpay • Server-verified"
    >
      <CheckoutClient
        initialPlan={planSlug}
        initialCycle={billingCycle}
        initialOutletCount={outletCount}
        totals={totals as any}
        isAuthenticated={!!userId}
        tenantId={tenantId}
        hasTenant={hasTenant}
        razorConfigured={razorConfigured}
        webhookConfigured={webhookConfigured}
      />
    </PageShell>
  );
}
