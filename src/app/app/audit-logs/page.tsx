export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getSession, getActiveOrgId } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function AuditLogs(){
  const { userId } = await getSession();
  if (!userId) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-8 text-center shadow-xs">
          <div className="text-lg font-bold text-[#172B25]">Please sign in to view audit logs</div>
          <Link href="/sign-in" className="mt-4 inline-block rounded-full bg-[#16845B] hover:bg-[#116B49] px-6 py-2.5 text-sm font-bold text-white shadow-xs">
            Sign In
          </Link>
        </div>
      </div>
    );
  }
  let tenantId = await getActiveOrgId();
  if(!tenantId){
    const mem = await prisma.membership.findFirst({ where:{ userId }});
    tenantId = mem?.tenantId || null;
  }
  const logs = tenantId ? await prisma.auditLog.findMany({ where:{ tenantId }, orderBy:{ createdAt:"desc"}, take:30 }) : [];

  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Audit Logs</h1>
        <p className="text-sm text-[#718078]">Immutable security audit records scoped to your tenant.</p>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Recent Activity — Tenant Scoped</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {logs.length ? (
            logs.map(l=> (
              <div key={l.id} className="flex justify-between items-center border-b border-[#E5EBE7] py-2.5">
                <span className="font-semibold text-[#172B25]">{l.action}</span>
                <span className="text-[#718078] text-xs">{l.entity} {l.entityId?.slice(0,8)} • {new Date(l.createdAt).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <div className="text-[#718078] text-sm py-6 text-center">
              No audit logs recorded yet. Actions such as ORDER_CREATED and TENANT_CREATED are logged automatically.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
