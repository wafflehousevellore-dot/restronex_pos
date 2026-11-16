export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaffContext } from "@/lib/server-auth";
import POSClient from "@/components/app/POSClient";
import Link from "next/link";
import { AlertCircle, Lock } from "lucide-react";

export const metadata = {
  title: "POS Billing Terminal — RestroNex Staff",
};

export default async function StaffPOSPage() {
  let context;
  try {
    context = await requireStaffContext({
      permission: "pos.view",
      requireSubscription: true,
    });
  } catch (err: any) {
    if (err.status === 402) {
      return (
        <div className="max-w-2xl mx-auto py-12 text-center bg-white rounded-3xl p-8 border border-[#E3EBE6]">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#0F1E19]">
            Restaurant Subscription Inactive
          </h2>
          <p className="mt-2 text-sm text-[#4A5D55]">
            Live POS billing requires an active restaurant subscription. Please notify your restaurant administrator to renew the plan.
          </p>
          <div className="mt-6">
            <Link
              href="/staff/dashboard"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#16845B] text-white text-xs font-semibold"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      );
    }
    if (err.status === 403) {
      return (
        <div className="max-w-md mx-auto py-12 text-center bg-white rounded-3xl p-8 border border-red-200">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Access Restricted</h2>
          <p className="mt-1 text-xs text-gray-600">
            You do not have permission to access the POS Billing Terminal. Please contact your manager.
          </p>
        </div>
      );
    }
    redirect("/staff/login");
  }

  const { membership } = context;
  const tenantId = membership.tenantId;

  // Filter outlets strictly by the staff member's authorized list
  const authorizedOutletIds = membership.authorizedOutlets.map((o) => o.id);
  const outletFilter =
    authorizedOutletIds.length > 0 ? { id: { in: authorizedOutletIds } } : {};
  const tableFilter =
    authorizedOutletIds.length > 0 ? { outletId: { in: authorizedOutletIds } } : {};

  const [outlets, tables, menuItems] = await Promise.all([
    prisma.outlet.findMany({
      where: { tenantId, status: "ACTIVE", ...outletFilter },
      orderBy: { createdAt: "asc" },
    }),
    prisma.table.findMany({
      where: { tenantId, ...tableFilter },
      orderBy: { number: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { tenantId, isActive: true },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const items = menuItems.map((m) => ({
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

  const tableData = tables.map((t) => ({
    id: t.id,
    number: t.number,
    status: t.status,
    area: t.area,
    currentOrderId: t.currentOrderId,
    orderTotalPaise: t.orderTotalPaise,
  }));

  const outletData = outlets.map((o) => ({ id: o.id, name: o.name }));

  return (
    <div className="space-y-4">
      <POSClient initialItems={items} initialTables={tableData} initialOutlets={outletData} />
    </div>
  );
}

