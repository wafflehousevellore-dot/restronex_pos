import { prisma } from "@/lib/db";
import { GRACE_PERIOD_DAYS } from "@/lib/subscription";

export type CustomerJourneyStatus =
  | "NEEDS_PAYMENT"
  | "NEEDS_ONBOARDING"
  | "ACTIVE_PAID_ONBOARDED"
  | "GRACE_PERIOD"
  | "EXPIRED"
  | "CANCELLED";

export interface CustomerJourneyResolution {
  status: CustomerJourneyStatus;
  redirectTo: string;
  tenantId: string | null;
  tenantName: string | null;
  subscriptionId: string | null;
  planSlug: string | null;
  planName: string | null;
  isPaid: boolean;
  onboardingStep: number;
  onboardingComplete: boolean;
  message?: string;
}

/**
 * Authoritative server-side customer journey resolver.
 * Determines the exact state and next destination for an authenticated user.
 * 
 * Rules:
 * 1. An existing customer who has paid & finished onboarding -> DIRECTLY to /app/pos (NEVER pay again).
 * 2. A customer who has paid but onboarding incomplete -> DIRECTLY to /app/onboarding at saved step.
 * 3. A customer who has not paid -> DIRECTLY to /checkout.
 * 4. A customer whose subscription expired & grace period passed -> /app/subscription.
 */
export async function resolveUserCustomerJourney(
  userId: string,
  preferredPlan?: { planSlug?: string | null; billingCycle?: string | null }
): Promise<CustomerJourneyResolution> {
  const fallbackPlan = preferredPlan?.planSlug || "starter";
  const fallbackCycle = preferredPlan?.billingCycle || "MONTHLY";

  // 1. Fetch user memberships with tenant, subscriptions and plan
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      tenant: {
        include: {
          subscriptions: {
            include: { plan: true },
            orderBy: { createdAt: "desc" },
          },
          outlets: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const now = new Date();

  // If user has at least one tenant
  if (memberships.length > 0) {
    // Check if user is a staff member (non-owner)
    const staffMembership = memberships.find((m) => m.role !== "OWNER");
    const isOnlyStaff = memberships.every((m) => m.role !== "OWNER");

    // If user only has staff roles, route to staff portal
    if (isOnlyStaff && staffMembership) {
      if (staffMembership.status === "SUSPENDED" || (staffMembership as any).status === "DEACTIVATED") {
        return {
          status: "CANCELLED",
          redirectTo: "/staff/login?error=suspended",
          tenantId: staffMembership.tenantId,
          tenantName: staffMembership.tenant.name,
          subscriptionId: null,
          planSlug: null,
          planName: null,
          isPaid: true,
          onboardingStep: 7,
          onboardingComplete: true,
          message: "Your staff access has been suspended by the restaurant administrator.",
        };
      }

      const role = staffMembership.role.toUpperCase();
      let staffDestination = "/staff/dashboard";
      if (role === "CASHIER") staffDestination = "/staff/pos";
      else if (role === "KITCHEN_STAFF") staffDestination = "/staff/kitchen";
      else if (role === "WAITER") staffDestination = "/staff/tables";
      else if (role === "INVENTORY_MANAGER") staffDestination = "/staff/inventory";

      return {
        status: "ACTIVE_PAID_ONBOARDED",
        redirectTo: staffDestination,
        tenantId: staffMembership.tenantId,
        tenantName: staffMembership.tenant.name,
        subscriptionId: staffMembership.tenant.subscriptions[0]?.id || null,
        planSlug: staffMembership.tenant.subscriptions[0]?.plan?.slug || null,
        planName: staffMembership.tenant.subscriptions[0]?.plan?.name || null,
        isPaid: true,
        onboardingStep: 7,
        onboardingComplete: true,
        message: `Welcome to ${staffMembership.tenant.name} staff portal.`,
      };
    }

    // Prioritize active paid tenant for returning customers so they are never prompted for payment
    const paidMembership = memberships.find((m) =>
      m.tenant.subscriptions?.some((s) => (s.status === "ACTIVE" || s.status === "PAST_DUE") && s.plan)
    );
    const mem = paidMembership || memberships[0];
    const tenant = mem.tenant;
    const subscriptions = tenant.subscriptions || [];

    // Find latest active or past_due subscription
    const activeSub = subscriptions.find(
      (s) => s.status === "ACTIVE" || s.status === "PAST_DUE"
    );
    const expiredSub = !activeSub
      ? subscriptions.find((s) => s.status === "EXPIRED" || s.status === "CANCELLED")
      : null;

    if (activeSub && activeSub.plan) {
      const periodEnd = new Date(activeSub.currentPeriodEnd);
      const graceEnd =
        activeSub.gracePeriodEndsAt ||
        new Date(periodEnd.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

      const isCurrentActive = activeSub.status === "ACTIVE" && now <= periodEnd;
      const isWithinGrace = now > periodEnd && now <= graceEnd;

      if (isCurrentActive || isWithinGrace) {
        // Customer has a valid paid subscription!
        if (tenant.onboardingComplete) {
          return {
            status: isWithinGrace ? "GRACE_PERIOD" : "ACTIVE_PAID_ONBOARDED",
            redirectTo: "/app/pos",
            tenantId: tenant.id,
            tenantName: tenant.name,
            subscriptionId: activeSub.id,
            planSlug: activeSub.plan.slug,
            planName: activeSub.plan.name,
            isPaid: true,
            onboardingStep: tenant.onboardingStep,
            onboardingComplete: true,
            message: isWithinGrace
              ? "Subscription in grace period. Please renew soon."
              : "Active subscription verified. POS ready.",
          };
        } else {
          // Paid, but onboarding is incomplete -> resume exact onboarding step!
          return {
            status: "NEEDS_ONBOARDING",
            redirectTo: `/app/onboarding`,
            tenantId: tenant.id,
            tenantName: tenant.name,
            subscriptionId: activeSub.id,
            planSlug: activeSub.plan.slug,
            planName: activeSub.plan.name,
            isPaid: true,
            onboardingStep: Math.min(Math.max(0, tenant.onboardingStep), 9),
            onboardingComplete: false,
            message: `Continuing onboarding for ${tenant.name} at Step ${tenant.onboardingStep + 1}.`,
          };
        }
      }

      // Past period and past grace period -> Expired
      return {
        status: "EXPIRED",
        redirectTo: "/app/subscription?due=true",
        tenantId: tenant.id,
        tenantName: tenant.name,
        subscriptionId: activeSub.id,
        planSlug: activeSub.plan.slug,
        planName: activeSub.plan.name,
        isPaid: false,
        onboardingStep: tenant.onboardingStep,
        onboardingComplete: tenant.onboardingComplete,
        message: "Your subscription has expired. Please renew to access POS.",
      };
    }

    if (expiredSub && expiredSub.plan) {
      return {
        status: "EXPIRED",
        redirectTo: "/app/subscription?due=true",
        tenantId: tenant.id,
        tenantName: tenant.name,
        subscriptionId: expiredSub.id,
        planSlug: expiredSub.plan.slug,
        planName: expiredSub.plan.name,
        isPaid: false,
        onboardingStep: tenant.onboardingStep,
        onboardingComplete: tenant.onboardingComplete,
        message: "Your subscription has expired. Please renew to access POS.",
      };
    }

    // Tenant exists but NO active subscription (e.g., PENDING or none)
    return {
      status: "NEEDS_PAYMENT",
      redirectTo: `/checkout?plan=${fallbackPlan}&cycle=${fallbackCycle}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      subscriptionId: null,
      planSlug: fallbackPlan,
      planName: null,
      isPaid: false,
      onboardingStep: 0,
      onboardingComplete: false,
      message: "Please complete subscription payment to access your restaurant.",
    };
  }

  // 2. User has no tenant yet
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Check if user has an activated pending registration or unlinked active payment
  const pendingReg = user?.email
    ? await prisma.pendingRegistration.findFirst({
        where: { email: user.email, status: "ACTIVATED" },
        orderBy: { createdAt: "desc" },
      })
    : null;

  if (pendingReg && pendingReg.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: pendingReg.tenantId },
      include: {
        subscriptions: { include: { plan: true } },
      },
    });

    if (tenant) {
      // Ensure user membership is created
      await prisma.membership.upsert({
        where: { userId_tenantId: { userId, tenantId: tenant.id } },
        create: { userId, tenantId: tenant.id, role: "OWNER" },
        update: {},
      });

      return {
        status: tenant.onboardingComplete ? "ACTIVE_PAID_ONBOARDED" : "NEEDS_ONBOARDING",
        redirectTo: tenant.onboardingComplete ? "/app/pos" : "/app/onboarding",
        tenantId: tenant.id,
        tenantName: tenant.name,
        subscriptionId: tenant.subscriptions[0]?.id || null,
        planSlug: tenant.subscriptions[0]?.plan?.slug || fallbackPlan,
        planName: tenant.subscriptions[0]?.plan?.name || null,
        isPaid: true,
        onboardingStep: tenant.onboardingStep,
        onboardingComplete: tenant.onboardingComplete,
      };
    }
  }

  // Brand new user with no tenant and no payment -> Must checkout first
  return {
    status: "NEEDS_PAYMENT",
    redirectTo: `/checkout?plan=${fallbackPlan}&cycle=${fallbackCycle}`,
    tenantId: null,
    tenantName: null,
    subscriptionId: null,
    planSlug: fallbackPlan,
    planName: null,
    isPaid: false,
    onboardingStep: 0,
    onboardingComplete: false,
    message: "Welcome to RestroNex. Please select and activate a subscription plan.",
  };
}

