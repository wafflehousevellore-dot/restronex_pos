export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TenantsAdmin() {
  const tenants = await prisma.tenant.findMany({
    include: { outlets: true, subscriptions: { include: { plan: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black text-[#172B25]">Restaurant Tenants Management</h1>
        <p className="text-sm text-[#718078]">Tenant status, active subscription plans, and registered outlets.</p>
      </div>

      <div className="grid gap-3.5">
        {tenants.map((t) => (
          <Card key={t.id} className="bg-white border-[#E5EBE7] shadow-xs hover:border-[#16845B] transition">
            <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-[#172B25] text-base flex items-center gap-2">
                  <span>{t.name}</span>
                  <Badge variant="secondary" className="bg-[#E8F5EE] text-[#16845B] border-[#E5EBE7]">
                    {t.status}
                  </Badge>
                </div>
                <div className="text-sm text-[#718078] mt-1">
                  {t.businessType} • {t.email} • {t.outlets.length} outlet(s)
                </div>
                <div className="text-xs text-[#718078] mt-0.5 font-mono">
                  {t.slug} • {t.country} • {t.timeZone}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-sm font-bold text-[#16845B]">
                  {t.subscriptions[0]?.plan?.name || "No plan"} • {t.subscriptions[0]?.status || "UNSUBSCRIBED"}
                </div>
                <div className="text-xs text-[#718078] mt-0.5 font-mono">{t.id.slice(0, 12)}…</div>
              </div>
            </CardContent>
          </Card>
        ))}
        {tenants.length === 0 && (
          <Card className="p-8 text-center bg-white border-[#E5EBE7]">
            <CardContent className="text-sm text-[#718078]">
              No tenants yet — create via onboarding or registration.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
