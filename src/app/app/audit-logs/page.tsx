export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getSession, getActiveOrgId } from "@/lib/auth";
import { Card, DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default async function AuditLogs(){
  const { userId } = await getSession();
  if (!userId) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-[#3D954F]/30 bg-[#3D954F]/10 border border-[#3D954F]/20 p-6 text-center">
          <div className="text-lg font-semibold text-white">Please sign in to view audit logs</div>
          <a href="/sign-in" className="mt-4 inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">Sign In</a>
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
    <div className="space-y-6 text-white">
      <h1 className="text-xl font-black text-white">Audit Logs</h1>
      <Card><CardHeader><CardTitle>Recent — tenant-scoped, immutable</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
        {logs.length ? logs.map(l=> <div key={l.id} className="flex justify-between border-b border-white/5 py-2"><span className="font-medium">{l.action}</span><span className="text-white/50">{l.entity} {l.entityId?.slice(0,8)} • {new Date(l.createdAt).toLocaleString()}</span></div>) : <div className="text-white/50">No logs yet — actions like ORDER_CREATED, TENANT_CREATED, DEMO_REQUEST_CREATED are logged.</div>}
      </CardContent></Card>
    </div>
  );
}
