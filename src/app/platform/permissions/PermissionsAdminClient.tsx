"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, ShieldCheck, Lock, AlertCircle } from "lucide-react";

export default function PermissionsAdminClient({
  roles,
  permissions,
  rolePermissions,
  descriptions,
}: {
  roles: string[];
  permissions: string[];
  rolePermissions: Record<string, string[]>;
  descriptions: Record<string, { label: string; description: string; badgeColor: string }>;
}) {
  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5EE] text-[#16845B] border border-[#E5EBE7] mb-2">
          <ShieldCheck className="h-3.5 w-3.5 text-[#16845B]" />
          <span>Platform Security Governance</span>
        </div>
        <h1 className="text-2xl font-black text-[#172B25]">Platform Role &amp; Permission Matrix</h1>
        <p className="text-sm text-[#718078]">
          Granular platform-level capabilities enforced server-side. Security boundaries prevent unauthorized financial access or destructive operations.
        </p>
      </div>

      {/* Primary Owner Invariant Card */}
      <div className="rounded-2xl border border-[#16845B]/20 bg-[#E8F5EE]/40 p-4 text-xs space-y-1">
        <div className="flex items-center gap-2 font-black text-sm text-[#16845B]">
          <Lock className="h-4 w-4" />
          <span>Primary Platform Owner Security Invariant</span>
        </div>
        <p className="text-[#172B25]">
          The role <strong>PLATFORM_OWNER</strong> is cryptographically restricted to the primary verified email account:{" "}
          <code className="bg-white px-2 py-0.5 rounded-md font-mono font-bold text-[#16845B] border border-[#E5EBE7]">
            wafflehousevellore@gmail.com
          </code>
          . It cannot be assigned to arbitrary users via frontend inputs.
        </p>
      </div>

      {/* Role Descriptions Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {roles.map((r) => {
          const meta = descriptions[r] || { label: r, description: "", badgeColor: "bg-[#718078] text-white" };
          return (
            <Card key={r} className="bg-white border-[#E5EBE7] shadow-xs">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${meta.badgeColor}`}>
                    {meta.label}
                  </span>
                  <span className="text-[11px] font-mono text-[#718078]">{rolePermissions[r]?.length || 0} Perms</span>
                </div>
                <p className="text-xs text-[#718078] leading-relaxed">{meta.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Capability Matrix Table */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-[#E5EBE7]">
          <CardTitle className="text-sm font-black text-[#172B25] flex items-center justify-between">
            <span>Granular Capability Matrix</span>
            <span className="text-xs font-normal text-[#718078]">Evaluated on every /api/platform/* request</span>
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[#718078] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3 min-w-[240px]">Platform Capability</th>
                {roles.map((r) => (
                  <th key={r} className="px-4 py-3 text-center">
                    {descriptions[r]?.label || r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7]">
              {permissions.map((perm) => (
                <tr key={perm} className="hover:bg-[#F8FAF9]/80 transition">
                  <td className="px-4 py-3 font-mono font-semibold text-[#172B25]">
                    {perm}
                  </td>
                  {roles.map((r) => {
                    const hasPerm = rolePermissions[r]?.includes(perm);
                    return (
                      <td key={r} className="px-4 py-3 text-center">
                        {hasPerm ? (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#E8F5EE] text-[#16845B]">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-100 text-gray-400">
                            <X className="h-3 w-3" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
