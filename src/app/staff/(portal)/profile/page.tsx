export const dynamic = "force-dynamic";

import { requireStaffContext } from "@/lib/server-auth";
import { ShieldCheck, Store, Building2, Check, Key } from "lucide-react";
import { ALL_PERMISSIONS } from "@/lib/permissions";

export const metadata = {
  title: "My Staff Profile — RestroNex Staff",
};

export default async function StaffProfilePage() {
  const { user, membership } = await requireStaffContext();
  const permissions = membership.permissions || [];
  const isOwner = membership.role === "OWNER";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EBE6] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/20 flex items-center justify-center text-[#16845B] font-bold text-2xl shadow-xs">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#0F1E19]">{user.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F5EE] text-[#16845B]">
                {membership.role}
              </span>
            </div>
            <p className="text-xs text-[#6F8279] mt-0.5">{user.email}</p>
            <p className="text-xs text-[#4A5D55] mt-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#16845B]" />
              {membership.tenant.name}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Organization & Outlets */}
        <div className="bg-white rounded-3xl p-6 border border-[#E3EBE6] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EEF3F0]">
            <Store className="w-4 h-4 text-[#16845B]" />
            <h2 className="text-sm font-bold text-[#0F1E19]">Assigned Outlets</h2>
          </div>

          <div className="space-y-2">
            {membership.authorizedOutlets.length > 0 ? (
              membership.authorizedOutlets.map((o) => (
                <div
                  key={o.id}
                  className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E3EBE6] flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-[#0F1E19]">{o.name}</span>
                  <span className="text-[11px] text-[#6F8279]">ID: {o.id.slice(0, 8)}...</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#6F8279]">All organization outlets accessible.</p>
            )}
          </div>
        </div>

        {/* Security & Authentication */}
        <div className="bg-white rounded-3xl p-6 border border-[#E3EBE6] shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EEF3F0]">
            <ShieldCheck className="w-4 h-4 text-[#16845B]" />
            <h2 className="text-sm font-bold text-[#0F1E19]">Security & Session Status</h2>
          </div>

          <div className="space-y-2.5 text-xs text-[#4A5D55]">
            <div className="flex justify-between py-1.5 border-b border-[#F0F5F2]">
              <span className="text-[#6F8279]">Account Status</span>
              <span className="font-bold text-[#16845B] capitalize">{membership.status}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F0F5F2]">
              <span className="text-[#6F8279]">Authentication Provider</span>
              <span className="font-medium text-[#0F1E19]">Clerk Enterprise Auth</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F0F5F2]">
              <span className="text-[#6F8279]">Multi-Tenant Isolation</span>
              <span className="font-medium text-[#16845B]">Enforced & Active</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#6F8279]">User ID</span>
              <span className="font-mono text-[10px] text-[#6F8279]">{user.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Granted Permissions List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E3EBE6] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#EEF3F0]">
          <Key className="w-4 h-4 text-[#16845B]" />
          <h2 className="text-sm font-bold text-[#0F1E19]">Role Capabilities & Permissions</h2>
        </div>

        <p className="text-xs text-[#6F8279]">
          The following system capabilities are authorized for your employee role:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ALL_PERMISSIONS.map((perm) => {
            const has = isOwner || permissions.includes(perm);
            return (
              <div
                key={perm}
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                  has
                    ? "bg-[#E8F5EE]/40 border-[#16845B]/20 text-[#0F1E19]"
                    : "bg-gray-50 border-gray-100 text-gray-400 opacity-60"
                }`}
              >
                <span className="font-mono text-[11px]">{perm}</span>
                {has ? (
                  <Check className="w-3.5 h-3.5 text-[#16845B]" />
                ) : (
                  <span className="text-[10px] text-gray-400">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
