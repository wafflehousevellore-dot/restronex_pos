export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle, Card, CardContent } from "@/components/ui/card";
export default async function PlatformAuditLogs(){
  const logs = await prisma.auditLog.findMany({ orderBy:{ createdAt:"desc"}, take:50 });
  return (
    <div className="space-y-4 text-white">
      <h1 className="text-xl font-black text-white">Audit Logs — platform</h1>
      <DarkCard><DarkCardContent className="pt-6 space-y-2 text-sm">{logs.map(l=> <div key={l.id} className="flex justify-between border-b border-slate-100 py-2"><span><strong>{l.action}</strong> • {l.entity} {l.entityId?.slice(0,8)}</span><span className="text-white/50">{new Date(l.createdAt).toLocaleString()} {l.tenantId?`• tenant ${l.tenantId.slice(0,8)}`:""}</span></div>)}{logs.length===0 && <div className="text-white/50">No logs yet.</div>}</DarkCardContent></DarkCard>
    </div>
  );
}
