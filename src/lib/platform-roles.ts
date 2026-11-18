/**
 * RestroNex Platform Administration RBAC Matrix
 * Governs platform-level capabilities for Platform Owners, Admins, Support, Finance, and Read-Only Auditors.
 */

export type PlatformRole =
  | "PLATFORM_OWNER"
  | "PLATFORM_SUPER_ADMIN"
  | "PLATFORM_SUPPORT"
  | "PLATFORM_FINANCE"
  | "PLATFORM_READ_ONLY";

export const ALL_PLATFORM_ROLES: PlatformRole[] = [
  "PLATFORM_OWNER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_FINANCE",
  "PLATFORM_READ_ONLY",
];

export const ALL_PLATFORM_PERMISSIONS = [
  "platform.dashboard.view",
  "platform.organizations.view",
  "platform.organizations.manage",
  "platform.subscriptions.view",
  "platform.subscriptions.manage",
  "platform.plans.view",
  "platform.plans.manage",
  "platform.payments.view",
  "platform.refunds.manage",
  "platform.analytics.view",
  "platform.audit.view",
  "platform.settings.manage",
  "platform.admins.manage",
] as const;

export type PlatformPermission = typeof ALL_PLATFORM_PERMISSIONS[number];

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, PlatformPermission[]> = {
  PLATFORM_OWNER: [
    "platform.dashboard.view",
    "platform.organizations.view",
    "platform.organizations.manage",
    "platform.subscriptions.view",
    "platform.subscriptions.manage",
    "platform.plans.view",
    "platform.plans.manage",
    "platform.payments.view",
    "platform.refunds.manage",
    "platform.analytics.view",
    "platform.audit.view",
    "platform.settings.manage",
    "platform.admins.manage",
  ],

  PLATFORM_SUPER_ADMIN: [
    "platform.dashboard.view",
    "platform.organizations.view",
    "platform.organizations.manage",
    "platform.subscriptions.view",
    "platform.subscriptions.manage",
    "platform.plans.view",
    "platform.plans.manage",
    "platform.payments.view",
    "platform.refunds.manage",
    "platform.analytics.view",
    "platform.audit.view",
    "platform.settings.manage",
  ],

  PLATFORM_FINANCE: [
    "platform.dashboard.view",
    "platform.organizations.view",
    "platform.subscriptions.view",
    "platform.payments.view",
    "platform.refunds.manage",
    "platform.analytics.view",
    "platform.audit.view",
  ],

  PLATFORM_SUPPORT: [
    "platform.dashboard.view",
    "platform.organizations.view",
    "platform.subscriptions.view",
    "platform.subscriptions.manage", // e.g. helping extend or retry subscription
    "platform.audit.view",
  ],

  PLATFORM_READ_ONLY: [
    "platform.dashboard.view",
    "platform.organizations.view",
    "platform.subscriptions.view",
    "platform.plans.view",
    "platform.payments.view",
    "platform.analytics.view",
    "platform.audit.view",
  ],
};

export const PLATFORM_ROLE_DESCRIPTIONS: Record<
  PlatformRole,
  { label: string; description: string; badgeColor: string }
> = {
  PLATFORM_OWNER: {
    label: "Platform Owner",
    description: "Ultimate system authority. Primary account: wafflehousevellore@gmail.com. Manages all plans, financials, credentials, and admin accounts.",
    badgeColor: "bg-[#16845B] text-white",
  },
  PLATFORM_SUPER_ADMIN: {
    label: "Super Admin",
    description: "Full operational authority over organizations, subscriptions, plans, and system settings. Cannot transfer platform ownership.",
    badgeColor: "bg-[#172B25] text-white",
  },
  PLATFORM_FINANCE: {
    label: "Platform Finance",
    description: "Specialized financial role. Inspects SaaS revenue, MRR/ARR, Razorpay payouts, and executes authorized customer refunds.",
    badgeColor: "bg-[#D97706] text-white",
  },
  PLATFORM_SUPPORT: {
    label: "Platform Support",
    description: "Customer service role. Assists restaurant owners with organization onboarding, subscription checks, and account diagnostics.",
    badgeColor: "bg-[#2563EB] text-white",
  },
  PLATFORM_READ_ONLY: {
    label: "Read-Only Auditor",
    description: "Observer role with read-only access to platform metrics, subscription counts, and audit logs. Mutation operations are strictly blocked.",
    badgeColor: "bg-[#718078] text-white",
  },
};

/**
 * Checks whether a platform role possesses a given platform capability.
 */
export function hasPlatformPermission(
  role: string | null | undefined,
  permission: PlatformPermission
): boolean {
  if (!role) return false;
  const normalized = role as PlatformRole;
  const permissions = PLATFORM_ROLE_PERMISSIONS[normalized];
  if (!permissions) return false;
  return permissions.includes(permission);
}
