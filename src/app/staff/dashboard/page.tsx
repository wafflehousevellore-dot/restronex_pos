export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaffContext } from "@/lib/server-auth";
import {
  ShoppingCart,
  ChefHat,
  Table2,
  Box,
  FileText,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

export default async function StaffDashboardPage() {
  const { user, membership } = await requireStaffContext();

  const role = membership.role.toUpperCase();
  const permissions = membership.permissions || [];
  const isOwner = role === "OWNER";
  const outletId = membership.outletId || membership.authorizedOutlets[0]?.id;

  const outletFilter = outletId ? { outletId } : {};

  // Fetch live stats based on permissions
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [ordersTodayCount, openTablesCount, activeTicketsCount, lowStockCount] = await Promise.all([
    prisma.order.count({
      where: {
        tenantId: membership.tenantId,
        ...outletFilter,
        createdAt: { gte: todayStart },
      },
    }),
    prisma.table.count({
      where: {
        tenantId: membership.tenantId,
        ...outletFilter,
        status: "OCCUPIED",
      },
    }),
    prisma.kitchenTicket.count({
      where: {
        tenantId: membership.tenantId,
        ...outletFilter,
        status: { in: ["RECEIVED", "PREPARING"] },
      },
    }),
    prisma.inventoryItem.count({
      where: {
        tenantId: membership.tenantId,
        currentStock: { lte: 5 }, // Low stock threshold
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EBE6] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#E8F5EE] text-[#16845B]">
              {role} WORKSPACE
            </span>
            <span className="text-xs text-[#6F8279]">• {membership.tenant.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F1E19] mt-1">
            Hello, {user.name} 👋
          </h1>
          <p className="text-sm text-[#4A5D55] mt-0.5">
            Here is your live station overview for today.
          </p>
        </div>

        {/* Quick Launch Button based on role */}
        <div className="flex items-center gap-3">
          {(isOwner || permissions.includes("pos.view")) && (
            <Link
              href="/staff/pos"
              className="inline-flex items-center gap-2 bg-[#16845B] hover:bg-[#126B49] text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-xs text-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              Open POS
            </Link>
          )}

          {(isOwner || permissions.includes("kitchen.view")) && (
            <Link
              href="/staff/kitchen"
              className="inline-flex items-center gap-2 bg-[#0F1E19] hover:bg-black text-white font-semibold px-4 py-2.5 rounded-xl transition shadow-xs text-sm"
            >
              <ChefHat className="w-4 h-4" />
              Kitchen Display
            </Link>
          )}
        </div>
      </div>

      {/* Role-Specific Metric Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(isOwner || permissions.includes("orders.view")) && (
          <div className="bg-white p-5 rounded-2xl border border-[#E3EBE6] shadow-xs">
            <div className="flex items-center justify-between text-[#6F8279] mb-2">
              <span className="text-xs font-semibold">Today&apos;s Orders</span>
              <FileText className="w-4 h-4 text-[#16845B]" />
            </div>
            <p className="text-2xl font-black text-[#0F1E19]">{ordersTodayCount}</p>
            <p className="text-[11px] text-[#6F8279] mt-1">Total placed today</p>
          </div>
        )}

        {(isOwner || permissions.includes("tables.view")) && (
          <div className="bg-white p-5 rounded-2xl border border-[#E3EBE6] shadow-xs">
            <div className="flex items-center justify-between text-[#6F8279] mb-2">
              <span className="text-xs font-semibold">Active Tables</span>
              <Table2 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-[#0F1E19]">{openTablesCount}</p>
            <p className="text-[11px] text-[#6F8279] mt-1">Currently dining</p>
          </div>
        )}

        {(isOwner || permissions.includes("kitchen.view")) && (
          <div className="bg-white p-5 rounded-2xl border border-[#E3EBE6] shadow-xs">
            <div className="flex items-center justify-between text-[#6F8279] mb-2">
              <span className="text-xs font-semibold">Active Kitchen KOTs</span>
              <ChefHat className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-[#0F1E19]">{activeTicketsCount}</p>
            <p className="text-[11px] text-[#6F8279] mt-1">In prep or cooking</p>
          </div>
        )}

        {(isOwner || permissions.includes("inventory.view")) && (
          <div className="bg-white p-5 rounded-2xl border border-[#E3EBE6] shadow-xs">
            <div className="flex items-center justify-between text-[#6F8279] mb-2">
              <span className="text-xs font-semibold">Low Stock Warnings</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-black text-red-600">{lowStockCount}</p>
            <p className="text-[11px] text-[#6F8279] mt-1">Needs reordering</p>
          </div>
        )}
      </div>

      {/* Role-Specific Operational Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* CASHIER & BILLING MODULE */}
        {(isOwner || role === "CASHIER" || role === "MANAGER" || permissions.includes("pos.view")) && (
          <div className="bg-white p-6 rounded-3xl border border-[#E3EBE6] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#E8F5EE] flex items-center justify-center text-[#16845B] mb-4">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-[#0F1E19]">POS & Billing Terminal</h2>
              <p className="text-xs text-[#4A5D55] mt-1">
                Enter orders, apply discounts, collect Cash / UPI / Card payments, and issue tax invoices.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#EEF3F0]">
              <Link
                href="/staff/pos"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16845B] hover:text-[#126B49]"
              >
                Launch POS Terminal <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* KITCHEN KDS MODULE */}
        {(isOwner || role === "KITCHEN_STAFF" || role === "MANAGER" || permissions.includes("kitchen.view")) && (
          <div className="bg-white p-6 rounded-3xl border border-[#E3EBE6] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700 mb-4">
                <ChefHat className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-[#0F1E19]">Kitchen Display System</h2>
              <p className="text-xs text-[#4A5D55] mt-1">
                Live aggregator & POS ticket lanes, audio alerts, preparation timers, and ready dispatch.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#EEF3F0]">
              <Link
                href="/staff/kitchen"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800"
              >
                Launch Kitchen Display <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* WAITER & TABLES MODULE */}
        {(isOwner || role === "WAITER" || role === "MANAGER" || permissions.includes("tables.view")) && (
          <div className="bg-white p-6 rounded-3xl border border-[#E3EBE6] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 mb-4">
                <Table2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-[#0F1E19]">Dining Floor & Tables</h2>
              <p className="text-xs text-[#4A5D55] mt-1">
                Seat guests, view occupancy, transfer tables, and fire dine-in orders directly to kitchen.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#EEF3F0]">
              <Link
                href="/staff/tables"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800"
              >
                Manage Dining Floor <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* INVENTORY MANAGER MODULE */}
        {(isOwner || role === "INVENTORY_MANAGER" || role === "MANAGER" || permissions.includes("inventory.view")) && (
          <div className="bg-white p-6 rounded-3xl border border-[#E3EBE6] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-700 mb-4">
                <Box className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-[#0F1E19]">Stock & Inventory</h2>
              <p className="text-xs text-[#4A5D55] mt-1">
                Track ingredient stock levels, log manual adjustments, and monitor automated recipe depletion.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#EEF3F0]">
              <Link
                href="/staff/inventory"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-800"
              >
                View Inventory Catalog <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* ORDERS MONITORING MODULE */}
        {(isOwner || permissions.includes("orders.view")) && (
          <div className="bg-white p-6 rounded-3xl border border-[#E3EBE6] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700 mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-[#0F1E19]">Order Activity Log</h2>
              <p className="text-xs text-[#4A5D55] mt-1">
                Real-time stream of all orders across Dine-in, Takeaway, Delivery, Swiggy, and Zomato.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#EEF3F0]">
              <Link
                href="/staff/orders"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                View Order History <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
