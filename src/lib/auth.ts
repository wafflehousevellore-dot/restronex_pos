// Clerk-first auth with JWT fallback (legacy demo/JWT still supported for API tests)
// Prisma User has clerkId, Tenant has clerkOrgId for mapping
import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret-change-in-production-32chars!!";
const COOKIE_NAME = "restronex_session";
const ORG_COOKIE = "restronex_org";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  isPlatformAdmin?: boolean;
};

// ---------- helpers ----------
export async function isHttpsFromHeaders(): Promise<boolean> {
  try {
    const h = await headers();
    return h.get("x-forwarded-proto") === "https" || (h.get("host") || "").includes("e2b.app") || (h.get("x-forwarded-host") || "").includes("e2b.app");
  } catch { return false; }
}
export function isHttpsFromRequest(req: { headers: { get: (k: string) => string | null }; url: string }): boolean {
  return req.headers.get("x-forwarded-proto") === "https" || req.url.startsWith("https://") || (req.headers.get("host") || "").includes("e2b.app");
}

export async function createSession(user: SessionUser, opts?: { secure?: boolean }) {
  const token = jwt.sign({ sub: user.id, email: user.email, name: user.name, isPlatformAdmin: user.isPlatformAdmin }, JWT_SECRET, { expiresIn: "7d" });
  const c = await cookies();
  let isHttps = opts?.secure;
  if (isHttps === undefined) isHttps = await isHttpsFromHeaders();
  if (isHttps) {
    c.set(COOKIE_NAME, token, { httpOnly: true, secure: true, sameSite: "none", partitioned: true, path: "/", maxAge: 60*60*24*7 } as unknown as Record<string, unknown>);
  } else {
    c.set(COOKIE_NAME, token, { httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: 60*60*24*7 });
  }
  return token;
}

export async function clearSession() {
  const c = await cookies();
  c.delete(COOKIE_NAME); c.delete(ORG_COOKIE);
}

// ---------- Clerk-first getSession ----------
export async function getSession(): Promise<{ user: SessionUser | null, userId: string | null, clerkUserId?: string | null, orgId?: string | null }> {
  // 1) Try Clerk (if configured with real keys)
  try {
    // dynamic import so build doesn't fail if Clerk env missing in some contexts
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId: clerkUserId, orgId } = await auth();
    if (clerkUserId) {
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress || clerkUser?.primaryEmailAddress?.emailAddress || "";
      const name = clerkUser?.fullName || [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || clerkUser?.username || email.split("@")[0] || "User";
      const avatarUrl = clerkUser?.imageUrl || null;

      // Upsert Prisma User by clerkId
      let dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
      if (!dbUser && email) {
        // fallback: find by email to link existing demo user
        dbUser = await prisma.user.findUnique({ where: { email } });
        if (dbUser && !dbUser.clerkId) {
          dbUser = await prisma.user.update({ where: { id: dbUser.id }, data: { clerkId: clerkUserId, avatarUrl, name } });
        }
      }
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            clerkId: clerkUserId,
            email: email || `${clerkUserId}@clerk.local`,
            name,
            avatarUrl,
            role: "OWNER",
            isPlatformAdmin: false,
          },
        });
        await prisma.auditLog.create({ data: { userId: dbUser.id, action: "USER_CREATED_VIA_CLERK", entity: "User", entityId: dbUser.id, metadataJson: JSON.stringify({ clerkUserId, email })} });
      }
      // If orgId present but no Tenant mapping, try to find tenant by clerkOrgId or create shadow mapping on demand (lazy)
      if (orgId) {
        let tenantByClerk = await prisma.tenant.findUnique({ where: { clerkOrgId: orgId } }).catch(() => null);
        if (!tenantByClerk) {
          // Check if this owner already has an existing tenant (prevent duplicate organization creation)
          const existingOwnedTenant = await prisma.tenant.findFirst({
            where: { memberships: { some: { userId: dbUser.id, role: "OWNER" } } },
            orderBy: { createdAt: "asc" },
          });

          if (existingOwnedTenant && !existingOwnedTenant.clerkOrgId) {
            // Securely associate existing organization with this Clerk Org ID
            tenantByClerk = await prisma.tenant.update({
              where: { id: existingOwnedTenant.id },
              data: { clerkOrgId: orgId },
            });
          } else if (!existingOwnedTenant) {
            // User genuinely has no organization yet: create their single primary organization
            try {
              const { clerkClient } = await import("@clerk/nextjs/server");
              const client = await clerkClient();
              const org = await client.organizations.getOrganization({ organizationId: orgId });
              const slugBase = org.slug || org.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
              const slug = slugBase + "-" + Math.random().toString(36).slice(2, 6);
              const tenant = await prisma.tenant.create({
                data: {
                  clerkOrgId: orgId,
                  name: org.name || "My Restaurant",
                  slug,
                  businessType: "Restaurant",
                  email: email || "owner@restronex.local",
                  phone: "+91 90000 00000",
                },
              });
              await prisma.membership.create({ data: { userId: dbUser.id, tenantId: tenant.id, role: "OWNER" } });
              await prisma.restaurantSetting.create({ data: { tenantId: tenant.id, receiptHeader: tenant.name } });
              await prisma.taxConfig.createMany({
                data: [
                  { tenantId: tenant.id, name: "CGST", rateBps: 900 },
                  { tenantId: tenant.id, name: "SGST", rateBps: 900 },
                ],
              });
              await prisma.auditLog.create({
                data: {
                  tenantId: tenant.id,
                  userId: dbUser.id,
                  action: "TENANT_CREATED_FROM_CLERK_ORG",
                  entity: "Tenant",
                  entityId: tenant.id,
                  metadataJson: JSON.stringify({ orgId, orgName: org.name }),
                },
              });
              tenantByClerk = tenant;
            } catch (e) {
              console.warn("[getSession] Clerk org lazy create failed", orgId, e);
            }
          }
        }

        if (tenantByClerk) {
          // ensure membership
          const mem = await prisma.membership
            .findUnique({ where: { userId_tenantId: { userId: dbUser.id, tenantId: tenantByClerk.id } } })
            .catch(() => null) as any;
          if (!mem) {
            const existing = await prisma.membership.findFirst({
              where: { userId: dbUser.id, tenantId: tenantByClerk.id },
            });
            if (!existing) {
              await prisma.membership.create({
                data: { userId: dbUser.id, tenantId: tenantByClerk.id, role: "OWNER" },
              });
            }
          }

          // Auto-sync organization name from Clerk if it differs
          try {
            const { clerkClient } = await import("@clerk/nextjs/server");
            const client = await clerkClient();
            const org = await client.organizations.getOrganization({ organizationId: orgId });
            if (org?.name && org.name !== tenantByClerk.name) {
              await prisma.tenant.update({
                where: { id: tenantByClerk.id },
                data: { name: org.name },
              });
              await prisma.restaurantSetting.updateMany({
                where: { tenantId: tenantByClerk.id },
                data: { receiptHeader: org.name },
              });
              tenantByClerk.name = org.name;
            }
          } catch {
            // non-blocking
          }
        }
      }

      const primaryEmailObj =
        clerkUser?.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId) ||
        clerkUser?.emailAddresses?.[0];
      const verifiedPlatformOwner =
        dbUser.isPlatformAdmin &&
        dbUser.role === "PLATFORM_OWNER" &&
        dbUser.email.toLowerCase() === "wafflehousevellore@gmail.com" &&
        primaryEmailObj?.verification?.status === "verified" &&
        primaryEmailObj?.emailAddress?.toLowerCase() === "wafflehousevellore@gmail.com";

      return {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          avatarUrl: dbUser.avatarUrl,
          isPlatformAdmin: Boolean(verifiedPlatformOwner),
        },
        userId: dbUser.id,
        clerkUserId,
        orgId,
      };
    }
  } catch {
    // Clerk not configured or not authenticated - fall through to JWT
    // console.debug("[getSession] Clerk miss, falling to JWT", e)
  }

  // 2) Fallback: JWT cookie (never grants Platform Admin privileges)
  try {
    const c = await cookies();
    const token = c.get(COOKIE_NAME)?.value;
    if (!token) return { user: null, userId: null };
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { sub: string };
    const dbUser = await prisma.user.findUnique({ where: { id: decoded.sub }});
    if (!dbUser) return { user: null, userId: null };
    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        avatarUrl: dbUser.avatarUrl,
        isPlatformAdmin: false,
      },
      userId: dbUser.id,
    };
  } catch { return { user: null, userId: null }; }
}

export async function getActiveOrgId(): Promise<string | null> {
  // Clerk org takes precedence
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { orgId } = await auth();
    if (orgId) {
      // map clerkOrgId -> tenantId if we have it
      const t = await prisma.tenant.findUnique({ where: { clerkOrgId: orgId } });
      if (t) return t.id;
      return orgId; // fallback raw clerk id (resolveTenantId will handle)
    }
  } catch {}
  const c = await cookies();
  return c.get(ORG_COOKIE)?.value ?? null;
}

export async function setActiveOrgId(orgId: string) {
  const c = await cookies();
  try {
    const isHttps = await isHttpsFromHeaders();
    if (isHttps) {
      c.set(ORG_COOKIE, orgId, { httpOnly: true, secure: true, sameSite: "none", partitioned: true, path: "/", maxAge: 60*60*24*7 } as unknown as Record<string, unknown>);
      return;
    }
  } catch {}
  c.set(ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60*60*24*7 });
}

export async function resolveTenantId(userId: string, explicit?: string | null): Promise<string | null> {
  if (explicit) return explicit;
  // Clerk org first
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { orgId } = await auth();
    if (orgId) {
      const t = await prisma.tenant.findUnique({ where: { clerkOrgId: orgId } });
      if (t) return t.id;
      // if orgId itself is a tenantId (legacy), use it
      const t2 = await prisma.tenant.findUnique({ where: { id: orgId } });
      if (t2) return t2.id;
    }
  } catch {}
  const active = await getActiveOrgId();
  if (active) {
    // active may be clerkOrgId - map
    const t = await prisma.tenant.findUnique({ where: { id: active } });
    if (t) return active;
    const t2 = await prisma.tenant.findUnique({ where: { clerkOrgId: active } });
    if (t2) return t2.id;
    return active;
  }

  // Prioritize active paid tenant for returning customers so they go straight to their paid restaurant
  const paidMem = await prisma.membership.findFirst({
    where: {
      userId,
      tenant: {
        subscriptions: {
          some: { status: "ACTIVE", currentPeriodEnd: { gte: new Date() } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  if (paidMem) return paidMem.tenantId;

  const mem = await prisma.membership.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  return mem?.tenantId || null;
}

export async function requireAuth(): Promise<SessionUser> {
  const { user } = await getSession();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function getTenantContext(tenantId: string, userId: string) {
  // tenantId may be clerkOrgId - resolve
  let tid = tenantId;
  const tByClerk = await prisma.tenant.findUnique({ where: { clerkOrgId: tenantId } }).catch(()=>null);
  if (tByClerk) tid = tByClerk.id;
  const membership = await prisma.membership.findFirst({ where: { tenantId: tid, userId }, include: { tenant: true }});
  if (!membership) throw new Error("FORBIDDEN: Not a member of this organization");
  return { membership, tenant: membership.tenant };
}

export async function assertCan(userId: string, tenantId: string, allowedRoles: string[]) {
  let tid = tenantId;
  const tByClerk = await prisma.tenant.findUnique({ where: { clerkOrgId: tenantId } }).catch(()=>null);
  if (tByClerk) tid = tByClerk.id;
  const m = await prisma.membership.findFirst({ where: { tenantId: tid, userId }});
  if (!m) throw new Error("FORBIDDEN");
  if (allowedRoles.length && !allowedRoles.includes(m.role) && !allowedRoles.includes("*")) {
    if (m.role !== "OWNER") throw new Error("FORBIDDEN: insufficient role");
  }
  return m;
}
