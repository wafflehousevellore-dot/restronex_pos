export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { requireStaffContext } from "@/lib/server-auth";
import OrdersPage from "@/app/app/orders/page";
import { AlertCircle } from "lucide-react";

export const metadata = {
  title: "Live Orders — RestroNex Staff",
};

export default async function StaffOrdersPage() {
  try {
    await requireStaffContext({
      permission: "orders.view",
    });
  } catch (err: any) {
    if (err.status === 403) {
      return (
        <div className="max-w-md mx-auto py-12 text-center bg-white rounded-3xl p-8 border border-red-200">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Access Restricted</h2>
          <p className="mt-1 text-xs text-gray-600">
            You do not have permission to view restaurant orders. Please contact your manager.
          </p>
        </div>
      );
    }
    redirect("/staff/login");
  }

  return <OrdersPage />;
}

