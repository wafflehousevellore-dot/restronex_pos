import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { PageShell } from "@/components/marketing/PageShell";
import CheckoutClient from "./CheckoutClient";
import { calcCheckoutTotals } from "@/lib/checkout";
import { isRazorpayConfigured, isWebhookConfigured } from "@/lib/razorpay";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
  const sp = await searchParams;
  const { userId } = await getSession();
  const c = await cookies();
  const persisted = c.get("restronex_checkout")?.value ? (()=>{ try{return JSON.parse(decodeURIComponent(c.get("restronex_checkout")!.value))}catch{return null} })() : null;
  const cookiePlan = c.get("restronex_plan")?.value ? decodeURIComponent(c.get("restronex_plan")!.value) : null;
  const planSlug = sp.plan || persisted?.planSlug || cookiePlan || "growth";
  const billingCycle = (sp.cycle as "MONTHLY"|"ANNUAL") || persisted?.billingCycle || (c.get("restronex_cycle")?.value as any) || "MONTHLY";
  const outletCount = parseInt(sp.outlets || persisted?.outletCount || "1", 10) || 1;

  // If not authed, preserve selection and redirect to sign-up (as per journey: explore → pricing → sign-up → checkout)
  if (!userId) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://restronex.vercel.app");
    const url = new URL("/sign-up", baseUrl);
    url.searchParams.set("plan", planSlug);
    url.searchParams.set("cycle", billingCycle);
    url.searchParams.set("next", `/checkout?plan=${planSlug}&cycle=${billingCycle}`);
    // Instead of server redirect, show interstitial that preserves plan (better UX + keeps SEO)
    // But we still enforce auth — client will redirect after showing preview
  }

  let totals;
  try { totals = calcCheckoutTotals({ planSlug, billingCycle, outletCount }); } catch (e:any) {
    return (
      <PageShell title="Checkout" subtitle={e.message} badge="Checkout">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-white">Invalid plan: {planSlug}. <a href="/pricing" className="underline">Choose a plan</a></div>
      </PageShell>
    );
  }

  const razorConfigured = isRazorpayConfigured();
  const webhookConfigured = isWebhookConfigured();

  // If already paid and subscription is active, do not prompt payment again
  let tenantId: string | null = null;
  let hasTenant = false;
  if (userId) {
    const mem = await prisma.membership.findFirst({
      where: { userId },
      include: {
        tenant: {
          include: {
            subscriptions: {
              where: { status: "ACTIVE", currentPeriodEnd: { gte: new Date() } },
              include: { plan: true },
            },
          },
        },
      },
    });
    tenantId = mem?.tenantId || null;
    hasTenant = !!tenantId;
    const activeSub = mem?.tenant?.subscriptions?.[0];
    if (activeSub && sp.renew !== "true" && sp.change !== "true") {
      if (mem?.tenant?.onboardingComplete) {
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
