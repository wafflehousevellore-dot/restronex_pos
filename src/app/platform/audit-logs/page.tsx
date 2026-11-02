export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PlatformAuditLogs(){
  const logs = await prisma.auditLog.findMany({ orderBy:{ createdAt:"desc"}, take:50 });

  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black text-[#172B25]">Platform Audit Logs</h1>
        <p className="text-sm text-[#718078]">Immutable system-wide events and tenant operations.</p>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardContent className="pt-5 pb-5 space-y-2 text-sm">
          {logs.map(l=> (
            <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5EBE7] py-2.5 text-xs">
              <span className="text-[#172B25]">
                <strong className="text-[#16845B] font-bold">{l.action}</strong> • {l.entity} {l.entityId?.slice(0,8)}
              </span>
              <span className="text-[#718078] mt-1 sm:mt-0 font-mono">
                {new Date(l.createdAt).toLocaleString()} {l.tenantId?`• tenant ${l.tenantId.slice(0,8)}`:""}
              </span>
            </div>
          ))}
          {logs.length===0 && <div className="text-[#718078] py-4 text-center">No platform logs recorded yet.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
