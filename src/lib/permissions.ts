/**
 * RestroNex Centralized Role & Permission System
 * Defines strict capability keys, system roles, default role entitlements,
 * and permission evaluation logic for Multi-Tenant Restaurant Staff.
 */

export const ALL_PERMISSIONS = [
  // POS
  "pos.view",
  "pos.create_order",
  "pos.modify_order",
  "pos.apply_discount",
  "pos.close_bill",
  "pos.process_payment",
  "pos.refund",

  // ORDERS
  "orders.view",
  "orders.create",
  "orders.update",
  "orders.delete",
  "orders.approve",
  "orders.cancel",
  "orders.export",

  // KITCHEN
  "kitchen.view",
  "kitchen.update_status",
  "kitchen.manage_orders",

  // TABLES
  "tables.view",
  "tables.manage",
  "tables.transfer",

  // INVENTORY
  "inventory.view",
  "inventory.create",
  "inventory.manage",
  "inventory.delete",
  "inventory.approve",
  "inventory.purchase",
  "inventory.adjust_stock",
  "inventory.export",

  // SHIFTS
  "shifts.view",
  "shifts.manage",
  "shifts.approve",
  "shifts.export",

  // ATTENDANCE
  "attendance.view",
  "attendance.manage",
  "attendance.approve",
  "attendance.export",

  // REPORTS
  "reports.view",
  "reports.export",
  "reports.financial",
  "reports.schedule",

  // AUDIT
  "audit.view",
  "audit.export",

  // STAFF
  "staff.view",
  "staff.invite",
  "staff.manage",
  "staff.deactivate",
  "staff.delete",
  "staff.export",

  // SETTINGS
  "settings.view",
  "settings.manage",

  // SUBSCRIPTIONS
  "subscription.view",
  "subscription.manage",
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

export const STAFF_ROLES = [
  "OWNER",
  "MANAGER",
  "CASHIER",
  "KITCHEN_STAFF",
  "WAITER",
  "INVENTORY_MANAGER",
  "ACCOUNTANT",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, PermissionKey[]> = {
  OWNER: [...ALL_PERMISSIONS],
  MANAGER: [
    "pos.view",
    "pos.create_order",
    "pos.modify_order",
    "pos.apply_discount",
    "pos.close_bill",
    "pos.process_payment",
    "orders.view",
    "orders.create",
    "orders.update",
    "orders.delete",
    "orders.approve",
    "orders.cancel",
    "orders.export",
    "kitchen.view",
    "kitchen.update_status",
    "kitchen.manage_orders",
    "tables.view",
    "tables.manage",
    "tables.transfer",
    "inventory.view",
    "inventory.create",
    "inventory.manage",
    "inventory.purchase",
    "inventory.adjust_stock",
    "inventory.export",
    "shifts.view",
    "shifts.manage",
    "shifts.approve",
    "shifts.export",
    "attendance.view",
    "attendance.manage",
    "attendance.approve",
    "attendance.export",
    "reports.view",
    "reports.export",
    "reports.schedule",
    "audit.view",
    "audit.export",
    "staff.view",
    "staff.invite",
    "staff.manage",
    "staff.export",
    "settings.view",
  ],
  CASHIER: [
    "pos.view",
    "pos.create_order",
    "pos.modify_order",
    "pos.apply_discount",
    "pos.close_bill",
    "pos.process_payment",
    "orders.view",
    "orders.create",
    "orders.update",
    "tables.view",
    "shifts.view",
    "attendance.view",
  ],
  KITCHEN_STAFF: [
    "kitchen.view",
    "kitchen.update_status",
    "kitchen.manage_orders",
    "orders.view",
    "shifts.view",
    "attendance.view",
  ],
  WAITER: [
    "pos.view",
    "pos.create_order",
    "orders.view",
    "orders.create",
    "tables.view",
    "tables.transfer",
    "kitchen.view",
    "shifts.view",
    "attendance.view",
  ],
  INVENTORY_MANAGER: [
    "inventory.view",
    "inventory.create",
    "inventory.manage",
    "inventory.purchase",
    "inventory.adjust_stock",
    "inventory.approve",
    "inventory.export",
    "reports.view",
    "shifts.view",
    "attendance.view",
  ],
  ACCOUNTANT: [
    "pos.view",
    "orders.view",
    "orders.export",
    "reports.view",
    "reports.export",
    "reports.financial",
    "audit.view",
    "audit.export",
    "shifts.view",
    "shifts.export",
    "attendance.view",
    "attendance.export",
  ],
};

/**
 * Calculates effective permissions for an employee based on their base role
 * merged with any tenant-customized permission overrides.
 */
export function getEffectivePermissions(
  role: string,
  customPermissions?: string[] | null
): PermissionKey[] {
  const normalizedRole = (role || "").toUpperCase() as StaffRole;
  const base = DEFAULT_ROLE_PERMISSIONS[normalizedRole] || [];

  if (normalizedRole === "OWNER") {
    return [...ALL_PERMISSIONS];
  }

  if (!customPermissions || !Array.isArray(customPermissions)) {
    return base;
  }

  const set = new Set<string>([...base, ...customPermissions]);
  return Array.from(set).filter((p): p is PermissionKey =>
    ALL_PERMISSIONS.includes(p as PermissionKey)
  );
}

/**
 * Checks if a role with optional custom overrides possesses a given permission.
 */
export function hasPermission(
  role: string,
  customPermissions: string[] | null | undefined,
  permission: PermissionKey
): boolean {
  if (!role) return false;
  const normalizedRole = role.toUpperCase() as StaffRole;
  if (normalizedRole === "OWNER") return true;

  const effective = getEffectivePermissions(normalizedRole, customPermissions);
  return effective.includes(permission);
}

/**
 * Human-readable metadata for permissions grouped by category for UI displays.
 */
export const PERMISSION_GROUPS: Record<
  string,
  { label: string; permissions: { key: PermissionKey; label: string; description: string }[] }
> = {
  pos: {
    label: "POS & Billing",
    permissions: [
      { key: "pos.view", label: "View POS", description: "Access POS billing interface" },
      { key: "pos.create_order", label: "Create Orders", description: "Place new dining and takeout orders" },
      { key: "pos.modify_order", label: "Modify Orders", description: "Edit cart items and quantities" },
      { key: "pos.apply_discount", label: "Apply Discounts", description: "Apply custom or coupon discounts" },
      { key: "pos.close_bill", label: "Close & Settle Bills", description: "Finalize transactions and generate invoices" },
      { key: "pos.process_payment", label: "Process Payments", description: "Collect Cash, UPI, and Card tenders" },
      { key: "pos.refund", label: "Process Refunds", description: "Issue refunds on settled transactions" },
    ],
  },
  orders: {
    label: "Orders Management",
    permissions: [
      { key: "orders.view", label: "View Orders", description: "View order history and live tickets" },
      { key: "orders.create", label: "Create Orders", description: "Create phone and table orders" },
      { key: "orders.update", label: "Update Orders", description: "Update order items and notes" },
      { key: "orders.delete", label: "Delete Orders", description: "Remove draft or invalid order records" },
      { key: "orders.approve", label: "Approve Orders", description: "Authorize special or high-value orders" },
      { key: "orders.cancel", label: "Cancel Orders", description: "Cancel pending or unserved orders" },
      { key: "orders.export", label: "Export Orders", description: "Export orders history to CSV" },
    ],
  },
  kitchen: {
    label: "Kitchen Display (KDS)",
    permissions: [
      { key: "kitchen.view", label: "View KDS", description: "Access kitchen display screen" },
      { key: "kitchen.update_status", label: "Update Prep Status", description: "Mark orders preparing and ready" },
      { key: "kitchen.manage_orders", label: "Manage Kitchen Tickets", description: "Reprint KOTs and acknowledge alerts" },
    ],
  },
  tables: {
    label: "Tables & Seating",
    permissions: [
      { key: "tables.view", label: "View Floor Plan", description: "See table occupancies and statuses" },
      { key: "tables.manage", label: "Manage Tables", description: "Add and configure dining tables and QR tokens" },
      { key: "tables.transfer", label: "Transfer Tables", description: "Move guests between dining tables" },
    ],
  },
  inventory: {
    label: "Inventory & Purchases",
    permissions: [
      { key: "inventory.view", label: "View Stock", description: "Check current ingredient stock levels" },
      { key: "inventory.create", label: "Create Inventory Items", description: "Add new raw ingredients or BOM recipes" },
      { key: "inventory.manage", label: "Manage Catalog Items", description: "Create and edit inventory raw materials" },
      { key: "inventory.delete", label: "Delete Inventory", description: "Remove discontinued stock items" },
      { key: "inventory.approve", label: "Approve Purchases", description: "Approve supplier purchase orders" },
      { key: "inventory.purchase", label: "Purchase Orders", description: "Draft and receive purchase orders" },
      { key: "inventory.adjust_stock", label: "Adjust Stock", description: "Record manual wastage and stock corrections" },
      { key: "inventory.export", label: "Export Inventory", description: "Download inventory valuation reports" },
    ],
  },
  shifts: {
    label: "Shift Management",
    permissions: [
      { key: "shifts.view", label: "View Shifts", description: "View scheduled staff shifts and cash registers" },
      { key: "shifts.manage", label: "Manage Shifts", description: "Create, schedule, and assign work shifts" },
      { key: "shifts.approve", label: "Approve Shift Close", description: "Verify drawer counts and sign off cash floats" },
      { key: "shifts.export", label: "Export Shifts", description: "Export shift roster and register logs" },
    ],
  },
  attendance: {
    label: "Attendance & Timeclock",
    permissions: [
      { key: "attendance.view", label: "View Attendance", description: "Inspect daily punches and staff presence" },
      { key: "attendance.manage", label: "Manage Timeclock", description: "Manually log or correct punch records" },
      { key: "attendance.approve", label: "Approve Overtime/Leaves", description: "Approve attendance exceptions" },
      { key: "attendance.export", label: "Export Attendance", description: "Download monthly attendance CSVs" },
    ],
  },
  reports: {
    label: "Reports & Analytics",
    permissions: [
      { key: "reports.view", label: "View Analytics", description: "View daily sales and operational insights" },
      { key: "reports.export", label: "Export Data", description: "Download CSV and Excel reporting summaries" },
      { key: "reports.financial", label: "Financial & Tax Data", description: "Access revenue, tax, and profit breakdowns" },
    ],
  },
  staff: {
    label: "Staff & Team",
    permissions: [
      { key: "staff.view", label: "View Team", description: "List staff members and active shifts" },
      { key: "staff.invite", label: "Invite Employees", description: "Send invitations to new team members" },
      { key: "staff.manage", label: "Manage Roles", description: "Modify outlet assignments and permissions" },
      { key: "staff.deactivate", label: "Suspend/Deactivate", description: "Revoke employee access temporarily" },
      { key: "staff.delete", label: "Remove Staff", description: "Permanently remove employee records" },
      { key: "staff.export", label: "Export Staff", description: "Export staff directory and profiles" },
    ],
  },
  settings: {
    label: "Settings",
    permissions: [
      { key: "settings.view", label: "View Settings", description: "Review restaurant settings and printer configs" },
      { key: "settings.manage", label: "Manage Settings", description: "Change tax configs, receipts, and integrations" },
    ],
  },
  subscription: {
    label: "Subscription",
    permissions: [
      { key: "subscription.view", label: "View Subscription", description: "View plan status and billing cycle" },
      { key: "subscription.manage", label: "Manage Subscription", description: "Upgrade or renew SaaS subscription" },
    ],
  },
};

