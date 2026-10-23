export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
export default async function TenantsAdmin(){
  const tenants = await prisma.tenant.findMany({ include:{ outlets:true, subscriptions:{ include:{ plan:true } } }, orderBy:{ createdAt:"desc"}});
  return (
    <div className="space-y-4 text-white">
      <h1 className="text-xl font-black text-white">Tenants — manage, suspend, entitlements</h1>
      <div className="grid gap-3">
        {tenants.map(t=> <DarkCard key={t.id}><DarkCardContent className="pt-5 flex justify-between"><div><div className="font-semibold">{t.name} <Badge variant="secondary">{t.status}</Badge></div><div className="text-sm text-white/60">{t.businessType} • {t.email} • {t.outlets.length} outlet(s)</div><div className="text-xs text-white/50">{t.slug} • {t.country} • {t.timeZone}</div></div><div className="text-right"><div className="text-sm">{t.subscriptions[0]?.plan?.name || "No plan"} • {t.subscriptions[0]?.status}</div><div className="text-xs text-white/50">{t.id.slice(0,8)}</div></div></DarkCardContent></DarkCard>)}
        {tenants.length===0 && <DarkCard><DarkCardContent className="pt-6 text-sm text-white/50">No tenants yet — create via onboarding.</DarkCardContent></DarkCard>}
      </div>
    </div>
  );
}
