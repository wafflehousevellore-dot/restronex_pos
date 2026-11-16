export const dynamic = "force-dynamic";

import { requireStaffContext } from "@/lib/server-auth";
import { prisma } from "@/lib/db";
import { Bell, CheckCircle2, Clock, ChefHat, ShoppingCart } from "lucide-react";

export const metadata = {
  title: "Staff Notifications — RestroNex Staff",
};

export default async function StaffNotificationsPage() {
  const { membership } = await requireStaffContext();

  const auditLogs = await prisma.auditLog.findMany({
    where: { tenantId: membership.tenantId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EBE6] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0F1E19]">Station Activity & Notifications</h1>
            <p className="text-xs text-[#6F8279] mt-0.5">
              Live updates and operational audit alerts for {membership.tenant.name}.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-[#E3EBE6] shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-[#0F1E19] mb-4">Recent Station Events</h2>

        {auditLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6F8279]">
            No recent activity logged for this workspace.
          </div>
        ) : (
          <div className="divide-y divide-[#EEF3F0]">
            {auditLogs.map((log) => {
              const isKitchen = log.action.includes("KITCHEN") || log.action.includes("KOT");
              const isOrder = log.action.includes("ORDER");
              const isStaff = log.action.includes("STAFF");

              return (
                <div key={log.id} className="py-3.5 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-600 mt-0.5">
                    {isKitchen ? (
                      <ChefHat className="w-4 h-4 text-amber-600" />
                    ) : isOrder ? (
                      <ShoppingCart className="w-4 h-4 text-[#16845B]" />
                    ) : isStaff ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0F1E19]">
                      {log.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-[11px] text-[#6F8279] truncate mt-0.5">
                      {log.entity} {log.entityId ? `• ${log.entityId}` : ""}
                    </p>
                  </div>
                  <div className="text-[10px] text-[#6F8279] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
