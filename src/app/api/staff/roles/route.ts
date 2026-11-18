import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  STAFF_ROLES,
  PermissionKey,
  PERMISSION_GROUPS,
} from "@/lib/permissions";

export interface CustomRoleItem {
  id: string;
  name: string;
  label: string;
  description: string;
  color: string;
  isSystemRole: boolean;
  permissions: PermissionKey[];
  createdAt?: string;
  updatedAt?: string;
}

const ROLES_PROVIDER = "staff_roles_config";

const SYSTEM_ROLES_METADATA: Record<string, { label: string; desc: string; color: string }> = {
  OWNER: {
    label: "Owner / Head Office",
    desc: "Complete administrative control over all outlets, financial accounts, subscriptions, and security policies.",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  MANAGER: {
    label: "Outlet Manager",
    desc: "Operations oversight, floor management, staff shift scheduling, and order overrides.",
    color: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  CASHIER: {
    label: "Cashier Terminal",
    desc: "POS register billing, customer payment collection, bill settlement, and thermal receipts.",
    color: "bg-amber-50 text-amber-800 border-amber-200",
  },
  WAITER: {
    label: "Floor Waiter",
    desc: "Tableside order taking, table assignment, sending KOT to kitchen, and guest assistance.",
    color: "bg-teal-50 text-teal-800 border-teal-200",
  },
  KITCHEN_STAFF: {
    label: "Kitchen Chef (KDS)",
    desc: "KDS screen access, prep status updates, station routing, and ticket bump workflows.",
    color: "bg-rose-50 text-rose-800 border-rose-200",
  },
  INVENTORY_MANAGER: {
    label: "Inventory & Stores",
    desc: "Stock tracking, raw ingredients receipt, supplier purchase orders, and wastage adjustments.",
    color: "bg-purple-50 text-purple-800 border-purple-200",
  },
  ACCOUNTANT: {
    label: "Finance & Accounts",
    desc: "Sales reports, tax invoices, profit & loss analytics, and shift reconciliation.",
    color: "bg-sky-50 text-sky-800 border-sky-200",
  },
};

/**
 * GET /api/staff/roles
 * Returns all system roles with default permissions, plus custom roles and permission groups metadata.
 */
export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  // Load custom roles
  const config = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: ROLES_PROVIDER } },
  });

  let customRoles: CustomRoleItem[] = [];
  if (config?.configJson) {
    try {
      customRoles = JSON.parse(config.configJson);
    } catch {
      customRoles = [];
    }
  }

  // Build system roles list
  const systemRoles: CustomRoleItem[] = STAFF_ROLES.map((roleKey) => ({
    id: `sys_${roleKey.toLowerCase()}`,
    name: roleKey,
    label: SYSTEM_ROLES_METADATA[roleKey]?.label || roleKey,
    description: SYSTEM_ROLES_METADATA[roleKey]?.desc || "",
    color: SYSTEM_ROLES_METADATA[roleKey]?.color || "bg-gray-50 text-gray-800 border-gray-200",
    isSystemRole: true,
    permissions: DEFAULT_ROLE_PERMISSIONS[roleKey] || [],
  }));

  return NextResponse.json({
    ok: true,
    systemRoles,
    customRoles,
    allPermissions: ALL_PERMISSIONS,
    permissionGroups: PERMISSION_GROUPS,
  });
}

/**
 * POST /api/staff/roles
 * Create or update a custom role.
 */
export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const currentMembership = await prisma.membership.findFirst({
    where: { userId, tenantId },
  });
  if (!currentMembership || (currentMembership.role !== "OWNER" && currentMembership.role !== "MANAGER" && currentMembership.role !== "HEAD_OFFICE")) {
    return NextResponse.json({ error: "Insufficient permissions to manage roles" }, { status: 403 });
  }

  const { id, name, label, description, color, permissions } = body;
  if (!name || !label) {
    return NextResponse.json({ error: "Role name and label are required" }, { status: 400 });
  }

  const normalizedName = name.trim().toUpperCase().replace(/\s+/g, "_");

  // Prevent overriding system roles via POST
  if (STAFF_ROLES.includes(normalizedName as any) && !id) {
    return NextResponse.json({ error: "Cannot create a role with a reserved system role name" }, { status: 400 });
  }

  const existingConfig = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: ROLES_PROVIDER } },
  });

  let customRoles: CustomRoleItem[] = [];
  if (existingConfig?.configJson) {
    try {
      customRoles = JSON.parse(existingConfig.configJson);
    } catch {
      customRoles = [];
    }
  }

  const roleId = id || `role_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const validPermissions = Array.isArray(permissions)
    ? permissions.filter((p: string) => ALL_PERMISSIONS.includes(p as PermissionKey))
    : [];

  const roleItem: CustomRoleItem = {
    id: roleId,
    name: normalizedName,
    label: label.trim(),
    description: description?.trim() || "",
    color: color || "bg-violet-50 text-violet-800 border-violet-200",
    isSystemRole: false,
    permissions: validPermissions,
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = customRoles.findIndex((r) => r.id === roleId);
  if (existingIdx >= 0) {
    customRoles[existingIdx] = roleItem;
  } else {
    roleItem.createdAt = new Date().toISOString();
    customRoles.push(roleItem);
  }

  await prisma.integrationConfig.upsert({
    where: { tenantId_provider: { tenantId, provider: ROLES_PROVIDER } },
    create: {
      tenantId,
      provider: ROLES_PROVIDER,
      status: "ACTIVE",
      configJson: JSON.stringify(customRoles),
      lastSyncAt: new Date(),
    },
    update: {
      configJson: JSON.stringify(customRoles),
      lastSyncAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: existingIdx >= 0 ? "ROLE_UPDATED" : "ROLE_CREATED",
      entity: "RoleDefinition",
      entityId: roleId,
      metadataJson: JSON.stringify({ name: normalizedName, label, permissionsCount: validPermissions.length }),
    },
  });

  return NextResponse.json({ ok: true, role: roleItem });
}
